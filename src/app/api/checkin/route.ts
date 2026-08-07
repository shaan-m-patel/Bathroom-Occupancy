import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, members, occupancySessions } from "@/db";
import { requireSession } from "@/lib/api-auth";
import { notifyHousehold } from "@/lib/notify";
import { expireStaleSessions } from "@/lib/status";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const durationMinutes = Number(body?.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) {
    return NextResponse.json(
      { error: "Duration must be between 1 and 180 minutes" },
      { status: 400 },
    );
  }
  const note = typeof body?.note === "string" ? body.note.trim() || null : null;

  const db = getDb();

  // A forgotten session from someone else expires before we check occupancy
  await expireStaleSessions(session.householdId);

  const [active] = await db
    .select({ session: occupancySessions, member: members })
    .from(occupancySessions)
    .innerJoin(members, eq(occupancySessions.memberId, members.id))
    .where(
      and(
        eq(occupancySessions.householdId, session.householdId),
        isNull(occupancySessions.endedAt),
      ),
    );

  if (active) {
    return NextResponse.json(
      { error: `Bathroom is occupied by ${active.member.name}` },
      { status: 409 },
    );
  }

  const expectedEndAt = new Date(Date.now() + durationMinutes * 60 * 1000);
  const [created] = await db
    .insert(occupancySessions)
    .values({
      householdId: session.householdId,
      memberId: session.memberId,
      note,
      expectedEndAt,
    })
    .returning();

  const [me] = await db
    .select()
    .from(members)
    .where(eq(members.id, session.memberId));

  await notifyHousehold(session.householdId, session.memberId, {
    type: "checked_in",
    title: "Bathroom occupied",
    body: `${me.name} checked into the bathroom for about ${durationMinutes} minutes.`,
  });

  return NextResponse.json({ session: created });
}
