import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb, households, members } from "@/db";
import { createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const inviteCode = body?.inviteCode?.trim().toUpperCase();
  const claimMemberId = body?.claimMemberId;
  const name = body?.name?.trim();
  if (!inviteCode || (!name && !claimMemberId)) {
    return NextResponse.json(
      { error: "Invite code and your name are required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, inviteCode));

  if (!household) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Rejoin as an existing member (new device / logged out)
  if (claimMemberId) {
    const [existing] = await db
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, claimMemberId),
          eq(members.householdId, household.id),
        ),
      );
    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    await createSessionCookie({
      memberId: existing.id,
      householdId: household.id,
    });
    return NextResponse.json({ household, member: existing });
  }

  const [member] = await db
    .insert(members)
    .values({
      householdId: household.id,
      name,
      emoji: body?.emoji || "🙂",
      color: body?.color || "#3b82f6",
    })
    .returning();

  await createSessionCookie({
    memberId: member.id,
    householdId: household.id,
  });

  return NextResponse.json({ household, member });
}
