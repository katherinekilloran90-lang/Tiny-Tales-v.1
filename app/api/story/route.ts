import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { openai, TEXT_MODEL } from "@/lib/openai";
import { isRequestSafe } from "@/lib/moderation";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { StoryStorageError, saveStory } from "@/lib/storyStore";
import { buildStoryPrompt, storyJsonSchema } from "@/lib/prompts";
import { generatedStorySchema, storyFormSchema } from "@/lib/validation";
import type { ApiErrorResponse, StoryRecord, StoryResponse } from "@/lib/types";

export const runtime = "nodejs";

const STORY_RATE_LIMIT = 8; // stories per window, per IP
const STORY_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function errorResponse(message: string, status: number) {
  return NextResponse.json<ApiErrorResponse>({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return errorResponse(
      "The server isn't configured with an OpenAI API key yet. Add OPENAI_API_KEY and try again.",
      500
    );
  }

  const ip = getClientIp(req.headers);
  const rateLimit = checkRateLimit(`story:${ip}`, STORY_RATE_LIMIT, STORY_RATE_WINDOW_MS);
  if (!rateLimit.allowed) {
    return errorResponse(
      "You've created a few stories in a row — please wait a bit before making another one.",
      429
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("We couldn't read that request.", 400);
  }

  const parsed = storyFormSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Please check your story details.";
    return errorResponse(firstIssue, 400);
  }
  const input = parsed.data;

  // Moderate the freeform fields (idea + optional child name) before we
  // spend anything on generation.
  try {
    const combinedText = [input.idea, input.childName].filter(Boolean).join(" — ");
    const safe = await isRequestSafe(combinedText);
    if (!safe) {
      return errorResponse(
        "That idea can't be turned into a children's story here. Please try a different, kid-friendly idea.",
        400
      );
    }
  } catch (err) {
    console.error("[story-spark] moderation check failed", err);
    return errorResponse("We couldn't check that request right now. Please try again shortly.", 502);
  }

  const prompt = buildStoryPrompt(input);

  let rawJson: string | null | undefined;
  try {
    const response = await openai.responses.create({
      model: TEXT_MODEL,
      input: [
        {
          role: "system",
          content:
            "You write and art-direct original children's storybooks for the Story Spark app. Always follow the safety rules given to you exactly, and always return data matching the required JSON schema.",
        },
        { role: "user", content: prompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: storyJsonSchema.name,
          schema: storyJsonSchema.schema,
          strict: storyJsonSchema.strict,
        },
      },
    });

    rawJson = response.output_text;
  } catch (err) {
    console.error("[story-spark] story generation failed", err);
    return errorResponse(
      "We had trouble dreaming up that story. Please try again in a moment.",
      502
    );
  }

  if (!rawJson) {
    return errorResponse("We had trouble dreaming up that story. Please try again.", 502);
  }

  let parsedStory: unknown;
  try {
    parsedStory = JSON.parse(rawJson);
  } catch (err) {
    console.error("[story-spark] story JSON parse failed", err);
    return errorResponse("We had trouble putting that story together. Please try again.", 502);
  }

  const storyValidation = generatedStorySchema.safeParse(parsedStory);
  if (!storyValidation.success) {
    console.error("[story-spark] story shape invalid", storyValidation.error.issues);
    return errorResponse("We had trouble putting that story together. Please try again.", 502);
  }
  const story = storyValidation.data;

  const record: StoryRecord = {
    id: randomUUID(),
    createdAt: Date.now(),
    imagesGenerated: 0,
    illustrationStyle: input.illustrationStyle,
    ...story,
  };

  try {
    await saveStory(record);
  } catch (err) {
    console.error("[story-spark] could not persist generated story", err);
    const message =
      err instanceof StoryStorageError
        ? "Your story was written, but we couldn't save it for illustration. Please try again in a moment."
        : "We had trouble saving that story. Please try again.";
    return errorResponse(message, 503);
  }

  const clientResponse: StoryResponse = {
    storyId: record.id,
    title: record.title,
    subtitle: record.subtitle,
    pages: record.pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text })),
  };

  return NextResponse.json(clientResponse);
}
