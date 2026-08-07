import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, members, occupancySessions } from "@/db";
import { requireSession } from "@/lib/api-auth";
import { notifyHousehold } from "@/lib/notify";

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const db = getDb();
  const [ended] = await db
    .update(occupancySessions)
    .set({ endedAt: new Date() })
    .where(
      and(
        eq(occupancySessions.householdId, session.householdId),
        eq(occupancySessions.memberId, session.memberId),
        isNull(occupancySessions.endedAt),
      ),
    )
    .returning();

  if (!ended) {
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
    type: "bathroom_available",
    title: "Bathroom available",
    body: `${me.name} finished — the bathroom is now available.`,
  });

  return NextResponse.json({ session: ended });
}
