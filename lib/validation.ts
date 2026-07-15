import { z } from "zod";
import {
  AGE_RANGES,
  ILLUSTRATION_STYLES,
  STORY_LENGTHS,
  STORY_STYLES,
  STORY_PAGE_COUNT,
} from "./types";

/**
 * Server-side validation for everything the browser can submit.
 *
 * This is the only gate that matters — the client-side form also validates,
 * but a request can always be forged, so every field is re-checked here.
 * In particular: no field lets the browser choose a model, a system prompt,
 * a token limit, or an image count. Those are all fixed in server code.
 */

const IDEA_MAX_LENGTH = 300;
const NAME_MAX_LENGTH = 30;

export const storyFormSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(3, "Tell us a little more about your story idea.")
    .max(IDEA_MAX_LENGTH, `Story ideas must be ${IDEA_MAX_LENGTH} characters or fewer.`),
  childName: z
    .string()
    .trim()
    .max(NAME_MAX_LENGTH, `Names must be ${NAME_MAX_LENGTH} characters or fewer.`)
    .regex(/^[\p{L}\p{M}' -]*$/u, "Names can only contain letters, spaces, hyphens, and apostrophes.")
    .optional()
    .or(z.literal("")),
  ageRange: z.enum(AGE_RANGES),
  storyStyle: z.enum(STORY_STYLES),
  illustrationStyle: z.enum(ILLUSTRATION_STYLES),
  storyLength: z.enum(STORY_LENGTHS),
});

export type StoryFormSchema = z.infer<typeof storyFormSchema>;

/** Validates the structured output we asked the model for. Defensive: even
 *  with Structured Outputs enforcing the JSON schema, we don't trust a
 *  network response until it's shaped exactly how we expect. */
export const generatedStorySchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(200),
  characterBible: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        role: z.string().min(1).max(60),
        description: z.string().min(1).max(600),
      })
    )
    .min(1)
    .max(8),
  visualDirection: z.string().min(1).max(800),
  coverPrompt: z.string().min(1).max(1200),
  pages: z
    .array(
      z.object({
        pageNumber: z.number().int().min(1).max(STORY_PAGE_COUNT),
        text: z.string().min(1).max(2000),
        illustrationPrompt: z.string().min(1).max(1200),
      })
    )
    .length(STORY_PAGE_COUNT),
});

export const imageRequestSchema = z.object({
  storyId: z.string().uuid(),
  target: z.union([z.literal("cover"), z.number().int().min(1).max(STORY_PAGE_COUNT)]),
});
