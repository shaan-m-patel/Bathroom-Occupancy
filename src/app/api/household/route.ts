import { NextRequest, NextResponse } from "next/server";
import { getDb, households, members } from "@/db";
import { createSessionCookie, generateInviteCode } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const householdName = body?.householdName?.trim();
  const name = body?.name?.trim();
  if (!householdName || !name) {
    return NextResponse.json(
      { error: "Household name and your name are required" },
      { status: 400 },
    );
  }

  const db = getDb();

  // Retry in the unlikely event of an invite code collision
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const timezone =
        typeof body?.timezone === "string" && body.timezone.length < 64
          ? body.timezone
          : "UTC";
      const [household] = await db
        .insert(households)
        .values({
          name: householdName,
          inviteCode: generateInviteCode(),
          timezone,
        })
        .returning();

      const [member] = await db
        .insert(members)
        .values({
          householdId: household.id,
          name,
          emoji: body?.emoji || "🙂",
          color: body?.color || "#3b82f6",
          isAdmin: true,
        })
        .returning();

      await createSessionCookie({
        memberId: member.id,
        householdId: household.id,
      });

      return NextResponse.json({ household, member });
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }

  return NextResponse.json({ error: "Could not create household" }, { status: 500 });
}
