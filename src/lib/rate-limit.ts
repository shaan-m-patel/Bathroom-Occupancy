import { sql } from "drizzle-orm";
import { getDb, rateLimitBuckets } from "@/db";

function coerceDate(value: Date | string | null | undefined, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

const WINDOW_MS = {
  fifteenMin: 15 * 60 * 1000,
  oneHour: 60 * 60 * 1000,
} as const;

export const RATE_LIMITS = {
  previewIp: { limit: 30, windowMs: WINDOW_MS.fifteenMin },
  previewHousehold: { limit: 60, windowMs: WINDOW_MS.fifteenMin },
  joinIp: { limit: 10, windowMs: WINDOW_MS.fifteenMin },
  joinHousehold: { limit: 20, windowMs: WINDOW_MS.fifteenMin },
  loginIp: { limit: 15, windowMs: WINDOW_MS.fifteenMin },
  loginHousehold: { limit: 20, windowMs: WINDOW_MS.fifteenMin },
  createHouseholdIp: { limit: 5, windowMs: WINDOW_MS.oneHour },
  reservationHousehold: { limit: 30, windowMs: WINDOW_MS.oneHour },
} as const;

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

/**
 * Fixed-window counter stored in Postgres so the limit holds across serverless
 * isolates. The upsert is atomic. Fails closed when the write fails.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const db = getDb();
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const boundedKey = key.slice(0, 200);

  const [row] = await db
    .insert(rateLimitBuckets)
    .values({
      key: boundedKey,
      count: 1,
      resetAt: new Date(Date.now() + windowMs),
    })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        count: sql`case when ${rateLimitBuckets.resetAt} <= now() then 1 else ${rateLimitBuckets.count} + 1 end`,
        resetAt: sql`case when ${rateLimitBuckets.resetAt} <= now() then now() + make_interval(secs => ${windowSec}) else ${rateLimitBuckets.resetAt} end`,
      },
    })
    .returning({
      count: rateLimitBuckets.count,
      resetAt: rateLimitBuckets.resetAt,
    });

  const count = Number(row?.count ?? limit + 1);
  const resetAt = coerceDate(row?.resetAt, new Date(Date.now() + windowMs));
  const retryAfterSec = Math.max(
    1,
    Math.ceil((resetAt.getTime() - Date.now()) / 1000),
  );
  return { allowed: count <= limit, retryAfterSec };
}
