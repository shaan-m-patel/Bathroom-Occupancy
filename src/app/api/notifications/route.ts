import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb, notifications } from "@/db";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const db = getDb();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.memberId, session.memberId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return NextResponse.json({ notifications: rows });
}

// Marks all of the caller's notifications as read
export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const db = getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.memberId, session.memberId),
        isNull(notifications.readAt),
      ),
    );

  return NextResponse.json({ ok: true });
}
