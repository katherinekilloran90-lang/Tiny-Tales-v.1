/**
 * Very small in-memory, fixed-window rate limiter.
 *
 * PROTOTYPE ONLY. This state lives in the Node process's memory, which means:
 *  - it resets whenever the server restarts or redeploys,
 *  - it does NOT work across multiple serverless instances (Vercel may run
 *    your route on several different lambdas at once, each with its own
 *    memory), and
 *  - it is trivially bypassed by anyone spreading requests across IPs.
 *
 * For a real deployment, replace this with a persistent, shared store such
 * as Upstash Redis (`@upstash/ratelimit`) or a database-backed limiter. See
 * README.md for details.
 */

interface Bucket {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count < limit) {
    existing.count += 1;
    return { allowed: true, remaining: limit - existing.count, retryAfterMs: 0 };
  }

  return {
    allowed: false,
    remaining: 0,
    retryAfterMs: windowMs - (now - existing.windowStart),
  };
}

// Periodically sweep old buckets so this Map doesn't grow forever in a
// long-lived dev server. Harmless no-op cost in serverless environments
// where the process is short-lived anyway.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart > 60 * 60 * 1000) buckets.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  // Don't keep the process alive just for this timer.
  if (typeof timer === "object" && "unref" in timer) timer.unref();
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  const real = headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
