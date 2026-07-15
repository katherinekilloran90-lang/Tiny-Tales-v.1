import type { StoryRecord } from "./types";

/**
 * In-memory story store, keyed by storyId.
 *
 * This is what keeps illustration prompts, the character bible, and visual
 * direction on the server: the browser only ever receives a storyId plus the
 * page text, and later asks for images "for storyId X, cover / page N". This
 * server process looks up the real prompt and never sends it to the client.
 *
 * PROTOTYPE ONLY — same caveats as rateLimit.ts: this resets on restart and
 * is not shared across serverless instances. A production version would use
 * a real database or cache (e.g. Redis) with the same short TTL.
 */

const STORY_TTL_MS = 30 * 60 * 1000; // 30 minutes

const store = new Map<string, StoryRecord>();

export function saveStory(record: StoryRecord): void {
  store.set(record.id, record);
}

export function getStory(id: string): StoryRecord | undefined {
  const record = store.get(id);
  if (!record) return undefined;
  if (Date.now() - record.createdAt > STORY_TTL_MS) {
    store.delete(id);
    return undefined;
  }
  return record;
}

export function incrementImageCount(id: string): number {
  const record = store.get(id);
  if (!record) return 0;
  record.imagesGenerated += 1;
  return record.imagesGenerated;
}

// Periodic cleanup of expired stories.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [id, record] of store) {
      if (now - record.createdAt > STORY_TTL_MS) store.delete(id);
    }
  }, SWEEP_INTERVAL_MS);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
}
