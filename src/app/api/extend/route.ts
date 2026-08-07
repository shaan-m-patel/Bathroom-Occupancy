import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, members, occupancySessions } from "@/db";
import { requireSession } from "@/lib/api-auth";
import { notifyHousehold } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const minutes = Number(body?.minutes);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
    return NextResponse.json(
      { error: "Extension must be between 1 and 60 minutes" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [extended] = await db
    .update(occupancySessions)
    .set({
      expectedEndAt: sql`${occupancySessions.expectedEndAt} + make_interval(mins => ${minutes})`,
    })
    .where(
      and(
        eq(occupancySessions.householdId, session.householdId),
        eq(occupancySessions.memberId, session.memberId),
        isNull(occupancySessions.endedAt),
      ),
    )
    .returning();

  if (!extended) {
    return NextResponse.json(
      { error: "You are not checked in" },
      { status: 404 },
    );
  }

  const [me] = await db
    .select()
    .from(members)
    .where(eq(members.id, session.memberId));

  await notifyHousehold(session.householdId, session.memberId, {
    type: "time_extended",
    title: "Bathroom time extended",
    body: `${me.name} extended their bathroom time by ${minutes} minutes.`,
  });

  return NextResponse.json({ session: extended });
}
