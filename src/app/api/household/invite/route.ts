import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, households, members } from "@/db";
import { createSessionCookie } from "@/lib/auth";
import { requireSession } from "@/lib/api-auth";
import { generateInviteCode } from "@/lib/secrets";

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const db = getDb();
  const [me] = await db
    .select({ isAdmin: members.isAdmin })
    .from(members)
    .where(eq(members.id, session.memberId));
  if (!me?.isAdmin) {
    return NextResponse.json(
      { error: "Only an admin can rotate the invite code" },
      { status: 403 },
    );
  }

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, session.householdId));
  if (!household) {
    return NextResponse.json({ error: "Household not found" }, { status: 404 });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [updated] = await db
        .update(households)
        .set({
          inviteCode: generateInviteCode(),
          sessionVersion: household.sessionVersion + 1,
        })
        .where(
          and(
            eq(households.id, household.id),
            eq(households.sessionVersion, household.sessionVersion),
          ),
        )
        .returning();
      if (!updated) {
        return NextResponse.json(
          { error: "Invite code changed. Try again." },
          { status: 409 },
        );
      }

      await createSessionCookie(
        { memberId: session.memberId, householdId: session.householdId },
        updated.sessionVersion,
      );
      return NextResponse.json({ inviteCode: updated.inviteCode });
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }

  return NextResponse.json({ error: "Could not rotate invite code" }, { status: 500 });
}
