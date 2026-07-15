import { NextRequest, NextResponse } from "next/server";
import { openai, IMAGE_MODEL } from "@/lib/openai";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getStory, incrementImageCount } from "@/lib/storyStore";
import { buildImagePrompt } from "@/lib/prompts";
import { imageRequestSchema } from "@/lib/validation";
import type { ApiErrorResponse, ImageResponseBody } from "@/lib/types";

export const runtime = "nodejs";

const IMAGE_RATE_LIMIT = 40; // image generations per window, per IP
const IMAGE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// A story only ever has 5 possible "slots" (cover + 4 pages), so that
// structural limit is enforced simply by there being 5 valid `target`
// values. On top of that, this caps total generation *attempts* (including
// regenerations) for a single story, as a per-story cost guard independent
// of the per-IP rate limit above.
const MAX_GENERATION_ATTEMPTS_PER_STORY = 20;

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
  const rateLimit = checkRateLimit(`image:${ip}`, IMAGE_RATE_LIMIT, IMAGE_RATE_WINDOW_MS);
  if (!rateLimit.allowed) {
    return errorResponse(
      "You've generated a lot of illustrations in a row — please wait a bit before trying again.",
      429
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("We couldn't read that request.", 400);
  }

  const parsed = imageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("That illustration request wasn't valid.", 400);
  }
  const { storyId, target } = parsed.data;

  const story = getStory(storyId);
  if (!story) {
    return errorResponse(
      "We couldn't find that story anymore. It may have expired — please create a new one.",
      404
    );
  }

  if (story.imagesGenerated >= MAX_GENERATION_ATTEMPTS_PER_STORY) {
    return errorResponse(
      "This story has reached its illustration generation limit for this session.",
      429
    );
  }

  const scenePrompt =
    target === "cover"
      ? story.coverPrompt
      : story.pages.find((p) => p.pageNumber === target)?.illustrationPrompt;

  if (!scenePrompt) {
    return errorResponse("That page doesn't exist for this story.", 400);
  }

  const finalPrompt = buildImagePrompt({
    illustrationStyle: story.illustrationStyle,
    visualDirection: story.visualDirection,
    characterBible: story.characterBible,
    scenePrompt,
  });

  try {
    const result = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt: finalPrompt,
      size: "1024x1024",
      quality: "medium", // fixed server-side for predictable per-image cost
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return errorResponse("We couldn't paint that illustration. Please try again.", 502);
    }

    // Only count successful generations against the per-story cap, so a
    // failed attempt doesn't burn part of the retry budget.
    incrementImageCount(storyId);

    const responseBody: ImageResponseBody = {
      target,
      image: `data:image/png;base64,${b64}`,
    };
    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("[story-spark] image generation failed", err);
    return errorResponse("We couldn't paint that illustration. Please try again.", 502);
  }
}
