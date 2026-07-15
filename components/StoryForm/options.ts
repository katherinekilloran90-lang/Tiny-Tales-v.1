import {
  AgeRange,
  IllustrationStyle,
  StoryLength,
  StoryStyle,
} from "@/lib/types";

export const ageRangeOptions: { value: AgeRange; label: string; hint: string; icon: string }[] = [
  { value: "3-5", label: "3–5", hint: "Little ones", icon: "🍼" },
  { value: "6-8", label: "6–8", hint: "Big kids", icon: "🎈" },
  { value: "9-11", label: "9–11", hint: "Young readers", icon: "🚀" },
];

export const storyStyleOptions: { value: StoryStyle; label: string; hint: string; icon: string }[] = [
  { value: "bedtime", label: "Bedtime", hint: "Soft & sleepy", icon: "🌙" },
  { value: "funny", label: "Funny", hint: "Silly & playful", icon: "😄" },
  { value: "adventure", label: "Adventure", hint: "Exciting quest", icon: "🗺️" },
  { value: "magical", label: "Magical", hint: "Wonder & whimsy", icon: "✨" },
  { value: "educational", label: "Educational", hint: "A gentle lesson", icon: "🌱" },
];

export const illustrationStyleOptions: {
  value: IllustrationStyle;
  label: string;
  hint: string;
  icon: string;
}[] = [
  { value: "soft-watercolor", label: "Soft Watercolour", hint: "Gentle, dreamy washes", icon: "🎨" },
  { value: "colorful-picture-book", label: "Colourful Picture Book", hint: "Bold & bright", icon: "🌈" },
  { value: "paper-collage", label: "Paper Collage", hint: "Textured cut-paper", icon: "✂️" },
  { value: "magical-3d", label: "Magical 3D", hint: "Soft rounded charm", icon: "🪄" },
];

export const storyLengthOptions: { value: StoryLength; label: string; hint: string; icon: string }[] = [
  { value: "short", label: "Short", hint: "4 quick pages", icon: "⚡" },
  { value: "standard", label: "Standard", hint: "4 fuller pages", icon: "📖" },
];

// Default values used for the fields that no longer appear in the primary,
// 3-question hero form. Advanced users can still change these in the
// collapsible "Customize the magic" section — nothing was removed from the
// underlying story generation pipeline, only hidden behind a simpler default.
export const DEFAULT_STORY_STYLE: StoryStyle = "magical";
export const DEFAULT_ILLUSTRATION_STYLE: IllustrationStyle = "colorful-picture-book";
export const DEFAULT_STORY_LENGTH: StoryLength = "standard";
