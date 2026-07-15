import { STORY_PAGE_COUNT } from "./types";
import type {
  AgeRange,
  CharacterBibleEntry,
  IllustrationStyle,
  StoryLength,
  StoryStyle,
} from "./types";
import type { StoryFormSchema } from "./validation";

const AGE_GUIDANCE: Record<AgeRange, string> = {
  "3-5":
    "Write for a 3-5 year old: very short, simple sentences, familiar concrete words, gentle repetition, and concrete relatable ideas (family, animals, colors, bedtime). Avoid complex plots or abstract concepts.",
  "6-8":
    "Write for a 6-8 year old: simple but varied sentences, a clear beginning-middle-end, light humor or gentle suspense is fine, everyday vocabulary with a few new words a child could learn.",
  "9-11":
    "Write for a 9-11 year old: fuller sentences and paragraphs, a real narrative arc with a small challenge to overcome, richer vocabulary, and a bit more independence and agency for the main character.",
};

const STYLE_GUIDANCE: Record<StoryStyle, string> = {
  bedtime:
    "Tone: soft, slow-paced, and soothing, building toward a calm, sleepy ending. Perfect for reading right before bed.",
  funny: "Tone: playful, silly, and warm, with gentle humor kids will giggle at. Never mean-spirited.",
  adventure: "Tone: energetic and exciting, with a small quest or challenge, but never actually scary or dangerous.",
  magical: "Tone: wonder-filled and whimsical, with a touch of gentle magic or fantasy.",
  educational: "Tone: curious and encouraging, naturally weaving in a simple fact, skill, or lesson without being preachy.",
};

const ILLUSTRATION_STYLE_LABEL: Record<IllustrationStyle, string> = {
  "soft-watercolor":
    "soft watercolor children's book illustration, gentle color washes, delicate linework, dreamy pastel palette, light and airy",
  "colorful-picture-book":
    "bold colorful picture-book illustration, thick clean outlines, flat saturated colors, playful rounded shapes",
  "paper-collage":
    "layered paper-collage illustration, textured cut-paper shapes, visible paper grain and edges, handmade craft-book look",
  "magical-3d":
    "whimsical soft 3D-rendered illustration, warm global illumination, rounded friendly character shapes, storybook charm",
};

const LENGTH_GUIDANCE: Record<StoryLength, string> = {
  short: `Keep each of the ${STORY_PAGE_COUNT} pages brief: roughly 40-70 words per page.`,
  standard: `Give each of the ${STORY_PAGE_COUNT} pages a bit more room: roughly 90-140 words per page.`,
};

export function illustrationStyleLabel(style: IllustrationStyle): string {
  return ILLUSTRATION_STYLE_LABEL[style];
}

/**
 * Builds the instructions sent to the OpenAI Responses API. This entire
 * prompt is server-authored — the browser cannot influence the system
 * instructions, only the four/five form fields captured in StoryFormSchema.
 */
export function buildStoryPrompt(input: StoryFormSchema): string {
  const name = input.childName?.trim();
  const nameInstruction = name
    ? `The child's name is "${name}". Naturally weave this name into the story as the main character or a character close to them — it should feel personal, not forced, and should not appear in every single sentence.`
    : "No child's name was given. Invent a warm, friendly name for the main character yourself.";

  return `You are the lead writer and art director for "Story Spark," an app that creates original, wholesome, illustrated children's storybooks.

Create one complete, original children's story based on this idea from a parent or child:
"${input.idea}"

${nameInstruction}

Audience: ${AGE_GUIDANCE[input.ageRange]}
Style: ${STYLE_GUIDANCE[input.storyStyle]}
Length: ${LENGTH_GUIDANCE[input.storyLength]}

Hard safety rules (never break these):
- No graphic violence, weapons, or physical harm.
- No sexual or romantic content of any kind.
- No dangerous instructions, real-world hazards, or anything a child could imitate to get hurt.
- No intensely frightening, gory, or nightmare-inducing content — mild, gentle tension is fine only for adventure stories, and it must resolve reassuringly.
- No real people, brands, or copyrighted/trademarked characters, franchises, or settings (invent your own original characters and world instead).
- The story must be entirely original — do not reuse or closely paraphrase existing published books, films, or fairy tales.
- The ending must be warm, satisfying, and reassuring, leaving the child feeling safe and happy.

Structure: exactly ${STORY_PAGE_COUNT} story pages (pageNumber 1 to ${STORY_PAGE_COUNT}), plus a title, subtitle, character bible, overall visual direction, and a cover illustration prompt.

Character bible requirements: describe every main character with enough concrete, reusable visual detail (physical appearance, exact clothing and colors, distinctive features/props) that an illustrator could draw that character identically on every page without seeing the others.

Illustration prompt requirements: the "coverPrompt" and every page's "illustrationPrompt" must each restate the specific visual details of every character who appears in that scene (from the character bible, in your own words is fine, but details must match exactly) plus the shared visual direction, so that an illustrator working from only that one prompt — with no other context — would draw every character identically across all five images. Each illustration prompt should also describe the setting, action, and mood of that specific scene. Do not describe any text, words, or letters appearing in the illustration itself.

Return only the structured story data — no extra commentary.`;
}

/** Combines the shared visual direction + character bible + a specific scene
 *  prompt into one final prompt for the image generation API. Built entirely
 *  server-side so the browser never sees or controls it. */
export function buildImagePrompt(params: {
  illustrationStyle: IllustrationStyle;
  visualDirection: string;
  characterBible: CharacterBibleEntry[];
  scenePrompt: string;
}): string {
  const { illustrationStyle, visualDirection, characterBible, scenePrompt } = params;

  const characterLines = characterBible
    .map((c) => `${c.name} (${c.role}): ${c.description}`)
    .join(" | ");

  return [
    `Children's storybook illustration. Art style: ${illustrationStyleLabel(illustrationStyle)}.`,
    `Overall visual direction: ${visualDirection}`,
    `Character reference sheet — render every character's appearance, clothing, and colors consistently with this description: ${characterLines}`,
    `Scene to illustrate: ${scenePrompt}`,
    "Absolutely no text, letters, numbers, or writing of any kind anywhere in the image. Warm, gentle, wholesome, and safe for young children. No violence, weapons, or frightening imagery.",
  ].join(" ");
}

/** JSON Schema used with the Responses API's Structured Outputs feature. */
export const storyJsonSchema = {
  name: "story_spark_story",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      subtitle: { type: "string" },
      characterBible: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            description: { type: "string" },
          },
          required: ["name", "role", "description"],
        },
      },
      visualDirection: { type: "string" },
      coverPrompt: { type: "string" },
      pages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            pageNumber: { type: "integer" },
            text: { type: "string" },
            illustrationPrompt: { type: "string" },
          },
          required: ["pageNumber", "text", "illustrationPrompt"],
        },
      },
    },
    required: [
      "title",
      "subtitle",
      "characterBible",
      "visualDirection",
      "coverPrompt",
      "pages",
    ],
  },
} as const;
