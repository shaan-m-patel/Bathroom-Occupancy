import { NextResponse } from "next/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";
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

  const durationMinutes = sql<number>`avg(extract(epoch from (${occupancySessions.endedAt} - ${occupancySessions.startedAt})) / 60)`;

  const [perMember, byHour] = await Promise.all([
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
      .where(
        and(
          eq(occupancySessions.householdId, session.householdId),
          isNotNull(occupancySessions.endedAt),
        ),
      )
      .groupBy(
        occupancySessions.memberId,
        members.name,
        members.emoji,
        members.color,
      ),
    db
      .select({
        hour: sql<number>`extract(hour from ${occupancySessions.startedAt} at time zone ${household.timezone})::int`,
        sessions: sql<number>`count(*)::int`,
      })
      .from(occupancySessions)
      .where(
        and(
          eq(occupancySessions.householdId, session.householdId),
          isNotNull(occupancySessions.endedAt),
        ),
      )
      .groupBy(
        sql`extract(hour from ${occupancySessions.startedAt} at time zone ${household.timezone})`,
      ),
  ]);

  return NextResponse.json({ perMember, byHour });
}
