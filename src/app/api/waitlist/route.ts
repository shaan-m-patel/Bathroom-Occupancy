import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, occupancySessions, waitlistEntries } from "@/db";
import { requireSession } from "@/lib/api-auth";

// Toggle "notify me when the bathroom is free" for the current member
export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const waiting = body?.waiting;
  if (typeof waiting !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getDb();

  if (!waiting) {
    await db
      .delete(waitlistEntries)
      .where(eq(waitlistEntries.memberId, session.memberId));
    return NextResponse.json({ waiting: false });
  }

  const [active] = await db
    .select({ memberId: occupancySessions.memberId })
    .from(occupancySessions)
    .where(
      and(
        eq(occupancySessions.householdId, session.householdId),
        isNull(occupancySessions.endedAt),
      ),
    );
  if (!active) {
    return NextResponse.json(
      { error: "The bathroom is already available" },
      { status: 409 },
    );
  }
  if (active.memberId === session.memberId) {
    return NextResponse.json(
      { error: "You're the one in there" },
      { status: 400 },
    );
  }

  await db
    .insert(waitlistEntries)
    .values({ householdId: session.householdId, memberId: session.memberId })
    .onConflictDoNothing();
  return NextResponse.json({ waiting: true });
}
