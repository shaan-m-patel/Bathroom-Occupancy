import { and, eq, gt, gte, isNotNull, lt } from "drizzle-orm";
import { getDb, reservations, type Reservation } from "@/db";

export async function findOverlap(
  householdId: string,
  startAt: Date,
  endAt: Date,
  excludeSeriesId?: string | null,
) {
  const db = getDb();
  const rows = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.householdId, householdId),
        lt(reservations.startAt, endAt),
        gt(reservations.endAt, startAt),
      ),
    );
  if (excludeSeriesId) {
    return rows.filter((r) => r.seriesId !== excludeSeriesId);
  }
  return rows;
}

/**
 * Finds the earliest slot of the same duration at or after the requested
 * start, scanning in 15-minute steps over the next 7 days.
 */
export async function suggestNearestSlot(
  householdId: string,
  startAt: Date,
  endAt: Date,
): Promise<{ startAt: Date; endAt: Date } | null> {
  const db = getDb();
  const durationMs = endAt.getTime() - startAt.getTime();
  const horizon = new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  const existing = await db
    .select({ startAt: reservations.startAt, endAt: reservations.endAt })
    .from(reservations)
    .where(
      and(
        eq(reservations.householdId, householdId),
        lt(reservations.startAt, horizon),
        gt(reservations.endAt, startAt),
      ),
    );

  const step = 15 * 60 * 1000;
  for (
    let candidate = startAt.getTime();
    candidate + durationMs <= horizon.getTime();
    candidate += step
  ) {
    const cStart = candidate;
    const cEnd = candidate + durationMs;
    const conflict = existing.some(
      (r) => r.startAt.getTime() < cEnd && r.endAt.getTime() > cStart,
    );
    if (!conflict) {
      return { startAt: new Date(cStart), endAt: new Date(cEnd) };
    }
  }
  return null;
}

/**
 * Ensures occurrences of a weekly recurring reservation exist for the next
 * `daysAhead` days. Occurrences that would overlap another reservation are
 * skipped. Idempotent: existing occurrences are not duplicated.
 */
export async function materializeSeries(
  anchor: Reservation,
  daysAhead = 14,
) {
  if (!anchor.recurrenceDays || !anchor.seriesId) return;
  const db = getDb();
  const now = new Date();
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const existing = await db
    .select({ startAt: reservations.startAt })
    .from(reservations)
    .where(
      and(
        eq(reservations.seriesId, anchor.seriesId),
        gte(reservations.startAt, now),
      ),
    );
  const existingTimes = new Set(existing.map((r) => r.startAt.getTime()));

  const durationMs = anchor.endAt.getTime() - anchor.startAt.getTime();
  const values: (typeof reservations.$inferInsert)[] = [];

  for (let day = 0; day <= daysAhead; day++) {
    const start = new Date(anchor.startAt);
    start.setDate(start.getDate() + day);
    if (start <= now || start > horizon) continue;
    if (!(anchor.recurrenceDays & (1 << start.getDay()))) continue;
    if (existingTimes.has(start.getTime())) continue;

    const end = new Date(start.getTime() + durationMs);
    const overlaps = await findOverlap(
      anchor.householdId,
      start,
      end,
      anchor.seriesId,
    );
    if (overlaps.length > 0) continue;

    values.push({
      householdId: anchor.householdId,
      memberId: anchor.memberId,
      startAt: start,
      endAt: end,
      reason: anchor.reason,
      seriesId: anchor.seriesId,
    });
  }

  if (values.length > 0) {
    await db.insert(reservations).values(values);
  }
}

/** Re-materializes all recurring series in the system (used by the daily cron). */
export async function materializeAllSeries() {
  const db = getDb();
  const anchors = await db
    .select()
    .from(reservations)
    .where(isNotNull(reservations.recurrenceDays));
  for (const anchor of anchors) {
    await materializeSeries(anchor);
  }
}
