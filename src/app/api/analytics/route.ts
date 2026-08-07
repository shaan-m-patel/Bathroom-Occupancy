import { NextResponse } from "next/server";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb, households, members, occupancySessions } from "@/db";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const db = getDb();
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, session.householdId));

  const completed = and(
    eq(occupancySessions.householdId, session.householdId),
    isNotNull(occupancySessions.endedAt),
  );
  const durationMinutes = sql<number>`avg(extract(epoch from (${occupancySessions.endedAt} - ${occupancySessions.startedAt})) / 60)`;
  const trendStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // Hour/weekday/day breakdowns are grouped per member so the client can
  // aggregate either a single member ("You") or the whole household.
  // Grouped by ordinals: repeating an expression with the timezone param
  // would bind it twice and Postgres would treat them as different exprs.
  const [perMember, byHour, byWeekday, byDay] = await Promise.all([
    db
      .select({
        memberId: occupancySessions.memberId,
        name: members.name,
        emoji: members.emoji,
        color: members.color,
        sessions: sql<number>`count(*)::int`,
        avgMinutes: sql<number>`round(${durationMinutes}::numeric, 1)::float`,
        totalMinutes: sql<number>`round((sum(extract(epoch from (${occupancySessions.endedAt} - ${occupancySessions.startedAt}))) / 60)::numeric)::int`,
      })
      .from(occupancySessions)
      .innerJoin(members, eq(occupancySessions.memberId, members.id))
      .where(completed)
      .groupBy(
        occupancySessions.memberId,
        members.name,
        members.emoji,
        members.color,
      ),
    db
      .select({
        hour: sql<number>`extract(hour from ${occupancySessions.startedAt} at time zone ${household.timezone})::int`,
        memberId: occupancySessions.memberId,
        sessions: sql<number>`count(*)::int`,
      })
      .from(occupancySessions)
      .where(completed)
      .groupBy(sql`1, 2`),
    db
      .select({
        weekday: sql<number>`extract(dow from ${occupancySessions.startedAt} at time zone ${household.timezone})::int`,
        memberId: occupancySessions.memberId,
        sessions: sql<number>`count(*)::int`,
      })
      .from(occupancySessions)
      .where(completed)
      .groupBy(sql`1, 2`),
    db
      .select({
        day: sql<string>`to_char(${occupancySessions.startedAt} at time zone ${household.timezone}, 'YYYY-MM-DD')`,
        memberId: occupancySessions.memberId,
        sessions: sql<number>`count(*)::int`,
        minutes: sql<number>`round((sum(extract(epoch from (${occupancySessions.endedAt} - ${occupancySessions.startedAt}))) / 60)::numeric)::int`,
      })
      .from(occupancySessions)
      .where(and(completed, gte(occupancySessions.startedAt, trendStart)))
      .groupBy(sql`1, 2`),
  ]);

  return NextResponse.json({
    timezone: household.timezone,
    perMember,
    byHour,
    byWeekday,
    byDay,
  });
}
