import { createClient } from "redis";
import type { StoryRecord } from "./types";

/**
 * Persistent story store, backed by standard Redis (e.g. Redis Cloud via the
 * Vercel Marketplace) through `REDIS_URL`.
 *
 * This is what keeps illustration prompts, the character bible, and visual
 * direction on the server: the browser only ever receives a storyId plus the
 * page text, and later asks for images "for storyId X, cover / page N". This
 * server looks up the real prompt and never sends it to the client.
 *
 * Why a shared Redis store instead of an in-memory Map: on Vercel,
 * `/api/story` and `/api/image` can run in different serverless function
 * instances (or the same instance after a cold start), each with its own
 * process memory. A plain in-memory Map is never guaranteed to be shared
 * between those requests, so a story saved by one instance could be
 * invisible to another — which is exactly what caused `/api/image` to return
 * 404 "story not found" for a story that had just been created. Redis is a
 * durable store every instance can reach over the network, which fixes this
 * reliably.
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

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new StoryStorageError(
      "Story storage isn't configured. Set the REDIS_URL environment variable."
    );
  }

  const redisClient = createClient({
    url,
    socket: {
      // By default node-redis retries a failed connection forever with
      // backoff, which would hang an API request (until the Vercel function
      // itself times out) instead of surfacing a clear error. Capping
      // retries means a genuinely unreachable Redis fails fast — while
      // still tolerating a few transient hiccups (e.g. a brief network
      // blip) without giving up immediately.
      reconnectStrategy(retries) {
        if (retries > 3) {
          return new Error("Too many Redis reconnection attempts");
        }
        return Math.min(retries * 200, 1000);
      },
    },
  });

  // node-redis requires at least one 'error' listener — without one, a
  // connection-level error (e.g. the server restarting) would crash the
  // whole process instead of just failing the current request.
  redisClient.on("error", (err) => {
    console.error("[story-spark] Redis client error", err);
  });

  return redisClient;
}

// Deriving the type from `createRedisClient` itself (rather than the raw,
// fully-generic `createClient`) keeps this single, concrete instantiation —
// avoiding a generic-parameter mismatch between two separately-inferred
// `createClient(...)` call sites.
type RedisClient = ReturnType<typeof createRedisClient>;

/**
 * A fresh TCP connection per request would be slow and could exhaust the
 * connection limit on a small Redis plan, so the client (and the in-flight
 * connection attempt) is cached on `globalThis`. This also survives
 * `next dev`'s hot-module-reloading, which would otherwise create a new
 * client — and a new leaked connection — on every file save. In a deployed
 * Vercel function, this means the client is created once per warm
 * serverless instance and reused for every request that instance handles.
 */
const globalForRedis = globalThis as unknown as {
  __storySparkRedisClient?: RedisClient;
  __storySparkRedisConnectPromise?: Promise<RedisClient>;
};

async function getClient(): Promise<RedisClient> {
  if (!globalForRedis.__storySparkRedisConnectPromise) {
    const redisClient = createRedisClient();
    globalForRedis.__storySparkRedisClient = redisClient;
    globalForRedis.__storySparkRedisConnectPromise = redisClient
      .connect()
      .then(() => redisClient)
      .catch((err: unknown) => {
        // Don't cache a permanently-failed connection attempt — let the
        // next call try again from scratch.
        globalForRedis.__storySparkRedisConnectPromise = undefined;
        globalForRedis.__storySparkRedisClient = undefined;
        console.error("[story-spark] failed to connect to Redis", err);
        throw new StoryStorageError();
      });
  }

  return globalForRedis.__storySparkRedisConnectPromise;
}

function storyKey(id: string): string {
  return `story-spark:story:${id}`;
}

export async function saveStory(record: StoryRecord): Promise<void> {
  try {
    const client = await getClient();
    await client.set(storyKey(record.id), JSON.stringify(record), { EX: STORY_TTL_SECONDS });
  } catch (err) {
    if (err instanceof StoryStorageError) throw err;
    console.error("[story-spark] failed to save story to Redis", err);
    throw new StoryStorageError();
  }
}

export async function getStory(id: string): Promise<StoryRecord | undefined> {
  try {
    const client = await getClient();
    const raw = await client.get(storyKey(id));
    if (!raw) return undefined;
    return JSON.parse(raw) as StoryRecord;
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
    const client = await getClient();
    const key = storyKey(id);
    const raw = await client.get(key);
    if (!raw) return 0;
    const record = JSON.parse(raw) as StoryRecord;
    record.imagesGenerated += 1;
    await client.set(key, JSON.stringify(record), { EX: STORY_TTL_SECONDS });
    return record.imagesGenerated;
  } catch (err) {
    if (err instanceof StoryStorageError) throw err;
    console.error("[story-spark] failed to update image count in Redis", err);
    throw new StoryStorageError();
  }
}
