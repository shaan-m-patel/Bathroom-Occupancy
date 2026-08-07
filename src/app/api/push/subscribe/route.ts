import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, pushSubscriptions } from "@/db";
import { requireSession } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const db = getDb();
  await db
    .insert(pushSubscriptions)
    .values({ memberId: session.memberId, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { memberId: session.memberId, p256dh, auth },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
  }

  const db = getDb();
  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, body.endpoint));

  return NextResponse.json({ ok: true });
}
