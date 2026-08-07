import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, members } from "@/db";
import { requireSession } from "@/lib/api-auth";
import { isCategoryKey } from "@/lib/notification-prefs";

function isMinuteOfDay(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 1440;
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const updates: Partial<{
    name: string;
    emoji: string;
    color: string;
    notificationPrefs: Record<string, boolean>;
    quietHoursStart: number | null;
    quietHoursEnd: number | null;
  }> = {};
  if (typeof body?.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body?.emoji === "string" && body.emoji) updates.emoji = body.emoji;
  if (typeof body?.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color)) {
    updates.color = body.color;
  }
  if (body?.notificationPrefs && typeof body.notificationPrefs === "object") {
    const prefs: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(body.notificationPrefs)) {
      if (isCategoryKey(key) && typeof value === "boolean") prefs[key] = value;
    }
    updates.notificationPrefs = prefs;
  }
  // Quiet hours come as a pair: both minutes-of-day, or both null to disable
  if ("quietHoursStart" in (body ?? {}) || "quietHoursEnd" in (body ?? {})) {
    const { quietHoursStart: start, quietHoursEnd: end } = body;
    if (isMinuteOfDay(start) && isMinuteOfDay(end)) {
      updates.quietHoursStart = start;
      updates.quietHoursEnd = end;
    } else if (start === null && end === null) {
      updates.quietHoursStart = null;
      updates.quietHoursEnd = null;
    } else {
      return NextResponse.json(
        { error: "Invalid quiet hours" },
        { status: 400 },
      );
    }
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
