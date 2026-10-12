import { NextRequest, NextResponse } from "next/server";
import { and, isNotNull, isNull, lt } from "drizzle-orm";
import { getDb, notifications, occupancySessions, rateLimitBuckets, reservations } from "@/db";
import { materializeAllSeries } from "@/lib/reservations";
import { cronAuthorized } from "@/lib/secrets";

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

  // Roll recurring reservations forward, one household at a time.
  await materializeAllSeries();

  // Prune old data to stay well within the Neon free-tier storage cap
  await db
    .delete(notifications)
    .where(lt(notifications.createdAt, daysAgo(30)));
  await db
    .delete(occupancySessions)
    .where(
      and(
        isNotNull(occupancySessions.endedAt),
        lt(occupancySessions.startedAt, daysAgo(180)),
      ),
    );
  // Past one-off reservations and materialized occurrences; recurrence anchors
  // are kept so their series keep rolling forward
  await db
    .delete(reservations)
    .where(
      and(
        lt(reservations.endAt, daysAgo(90)),
        isNull(reservations.recurrenceDays),
      ),
    );
  await db
    .delete(rateLimitBuckets)
    .where(lt(rateLimitBuckets.resetAt, daysAgo(1)));

  return NextResponse.json({ ok: true });
}
