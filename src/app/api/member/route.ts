import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, members } from "@/db";
import { requireSession } from "@/lib/api-auth";

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const updates: Partial<{ name: string; emoji: string; color: string }> = {};
  if (typeof body?.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body?.emoji === "string" && body.emoji) updates.emoji = body.emoji;
  if (typeof body?.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color)) {
    updates.color = body.color;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(members)
    .set(updates)
    .where(eq(members.id, session.memberId))
    .returning();

  return NextResponse.json({ member: updated });
}
