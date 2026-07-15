import { openai, MODERATION_MODEL } from "./openai";

/**
 * Runs the submitted idea (and child name, if given) through OpenAI's
 * moderation endpoint before we spend anything on story or image
 * generation. This is a coarse, prototype-level safety gate — see the
 * README for production hardening notes.
 */
export async function isRequestSafe(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const result = await openai.moderations.create({
    model: MODERATION_MODEL,
    input: trimmed,
  });

  const flagged = result.results.some((r) => r.flagged);
  return !flagged;
}
