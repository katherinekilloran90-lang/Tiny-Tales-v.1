import { Redis } from "@upstash/redis";
import type { StoryRecord } from "./types";

/**
 * Persistent story store, backed by Upstash Redis.
 *
 * This is what keeps illustration prompts, the character bible, and visual
 * direction on the server: the browser only ever receives a storyId plus the
 * page text, and later asks for images "for storyId X, cover / page N". This
 * server looks up the real prompt and never sends it to the client.
 *
 * Why Redis instead of an in-memory Map: on Vercel, `/api/story` and
 * `/api/image` can run in different serverless function instances (or the
 * same instance after a cold start), each with its own process memory. A
 * plain in-memory Map is never guaranteed to be shared between those
 * requests, so a story saved by one instance could be invisible to
 * another — which is exactly what caused `/api/image` to return 404 "story
 * not found" for a story that had just been created. Upstash Redis is a
 * durable, low-latency, REST-based store that every instance can reach,
 * which fixes this reliably.
 */

const STORY_TTL_SECONDS = 60 * 60; // ~1 hour, so prototype data cleans up on its own

/** Thrown whenever the story store can't be reached at all (missing
 *  configuration or a Redis error) — distinct from a story simply not
 *  existing/having expired, so routes can return the right error to the user. */
export class StoryStorageError extends Error {
  constructor(message = "Story storage is temporarily unavailable.") {
    super(message);
    this.name = "StoryStorageError";
  }
}

let client: Redis | null = null;

function getClient(): Redis {
  if (client) return client;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new StoryStorageError(
      "Story storage isn't configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }

  client = Redis.fromEnv();
  return client;
}

function storyKey(id: string): string {
  return `story-spark:story:${id}`;
}

export async function saveStory(record: StoryRecord): Promise<void> {
  try {
    await getClient().set(storyKey(record.id), record, { ex: STORY_TTL_SECONDS });
  } catch (err) {
    if (err instanceof StoryStorageError) throw err;
    console.error("[story-spark] failed to save story to Redis", err);
    throw new StoryStorageError();
  }
}

export async function getStory(id: string): Promise<StoryRecord | undefined> {
  try {
    const record = await getClient().get<StoryRecord>(storyKey(id));
    return record ?? undefined;
  } catch (err) {
    if (err instanceof StoryStorageError) throw err;
    console.error("[story-spark] failed to read story from Redis", err);
    throw new StoryStorageError();
  }
}

/**
 * Increments and persists the story's image-generation counter, returning
 * the new count (0 if the story no longer exists/has expired).
 *
 * This is a read-modify-write, not an atomic Redis operation — for this
 * prototype's scale (one browser tab generating a handful of images per
 * story) that's an acceptable trade-off for keeping the whole record as one
 * simple JSON value. A high-concurrency production version should track the
 * counter in its own key and increment it with Redis `INCR`.
 */
export async function incrementImageCount(id: string): Promise<number> {
  try {
    const key = storyKey(id);
    const record = await getClient().get<StoryRecord>(key);
    if (!record) return 0;
    record.imagesGenerated += 1;
    await getClient().set(key, record, { ex: STORY_TTL_SECONDS });
    return record.imagesGenerated;
  } catch (err) {
    if (err instanceof StoryStorageError) throw err;
    console.error("[story-spark] failed to update image count in Redis", err);
    throw new StoryStorageError();
  }
}
