import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, households, members } from "@/db";

// Public preview of a household by invite code, so joiners can
// claim an existing profile instead of creating a duplicate.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const db = getDb();
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, code));
  if (!household) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      emoji: members.emoji,
      color: members.color,
    })
    .from(members)
    .where(eq(members.householdId, household.id));

  return NextResponse.json({
    household: { name: household.name },
    members: rows,
  });
}
