import { and, asc, eq, gt, gte, isNotNull, lt, sql } from "drizzle-orm";
import { getDb, reservations, type Reservation } from "@/db";
import { LIMITS } from "@/lib/codes";

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
 *
 * Overlaps are loaded once for the window. If that household already has more
 * future rows than the maintenance budget, this series is left alone so a
 * single household cannot turn the call into an unbounded read.
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

  const conflicts = await db
    .select({
      startAt: reservations.startAt,
      endAt: reservations.endAt,
      seriesId: reservations.seriesId,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.householdId, anchor.householdId),
        lt(reservations.startAt, horizon),
        gt(reservations.endAt, now),
      ),
    )
    .limit(LIMITS.maintenanceRowBudget);
  if (conflicts.length >= LIMITS.maintenanceRowBudget) return;

  const durationMs = anchor.endAt.getTime() - anchor.startAt.getTime();
  const values: (typeof reservations.$inferInsert)[] = [];

  for (let day = 0; day <= daysAhead; day++) {
    const start = new Date(anchor.startAt);
    start.setDate(start.getDate() + day);
    if (start <= now || start > horizon) continue;
    if (!(anchor.recurrenceDays & (1 << start.getDay()))) continue;
    if (existingTimes.has(start.getTime())) continue;

    const end = new Date(start.getTime() + durationMs);
    const overlap = conflicts.some(
      (row) =>
        row.seriesId !== anchor.seriesId &&
        row.startAt.getTime() < end.getTime() &&
        row.endAt.getTime() > start.getTime(),
    );
    if (overlap) continue;

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

/** Rotates which household is visited first so a large one cannot stay at the head of the queue. */
export function rotateHouseholdOrder<T>(items: T[], epochMs: number) {
  if (items.length === 0) return items;
  const start = Math.floor(epochMs / 86_400_000) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

/**
 * Re-materializes recurring series for the daily cron.
 * Households are visited in a rotating order. Each household contributes at
 * most `seriesPerHouseholdPerRun` series, and the run stops after
 * `seriesPerCronRun` so one household's volume cannot consume the whole job.
 */
export async function materializeAllSeries() {
  const db = getDb();
  const householdRows = await db
    .selectDistinct({ householdId: reservations.householdId })
    .from(reservations)
    .where(isNotNull(reservations.recurrenceDays))
    .orderBy(asc(reservations.householdId));

  const ordered = rotateHouseholdOrder(
    householdRows.map((row) => row.householdId),
    Date.now(),
  );

  let processed = 0;
  for (const householdId of ordered) {
    if (processed >= LIMITS.seriesPerCronRun) break;

    const [volume] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.householdId, householdId),
          gt(reservations.endAt, new Date()),
        ),
      );
    if (Number(volume?.count ?? 0) > LIMITS.maintenanceRowBudget) continue;

    const remaining = Math.min(
      LIMITS.seriesPerHouseholdPerRun,
      LIMITS.seriesPerCronRun - processed,
    );
    const anchors = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.householdId, householdId),
          isNotNull(reservations.recurrenceDays),
        ),
      )
      .orderBy(asc(reservations.id))
      .limit(remaining);

    for (const anchor of anchors) {
      try {
        await materializeSeries(anchor);
      } catch (err) {
        console.error("Failed to materialize series", anchor.id, err);
      }
      processed++;
    }
  }
}
