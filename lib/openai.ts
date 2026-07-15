import OpenAI from "openai";

/**
 * Single server-only OpenAI client. This file is never imported by any
 * client component — Next.js route handlers run on the server, so
 * process.env.OPENAI_API_KEY is read here and never sent to the browser.
 */
if (!process.env.OPENAI_API_KEY) {
  // We don't throw at import time (that would crash the whole server on
  // boot in some environments); route handlers check for this and return a
  // clean error instead.
  console.warn(
    "[story-spark] OPENAI_API_KEY is not set. API routes will return an error until it is configured."
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
// gpt-image-1 is being deprecated by OpenAI on 2026-10-23; gpt-image-1.5 is
// the current, cost-effective default. This is a server-only constant, so
// the browser can never request a different (potentially pricier) model.
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";
export const MODERATION_MODEL = "omni-moderation-latest";
