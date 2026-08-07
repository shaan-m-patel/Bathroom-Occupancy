import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, households, members } from "@/db";
import { createSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const inviteCode = body?.inviteCode?.trim().toUpperCase();
  const name = body?.name?.trim();
  if (!inviteCode || !name) {
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
