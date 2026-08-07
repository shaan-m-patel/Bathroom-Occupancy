import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { challenges, getDb, households, members, reservations } from "@/db";
import { requireSession } from "@/lib/api-auth";
import { notifyMembers } from "@/lib/notify";
import { formatTime } from "@/lib/time";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const reservationId = body?.reservationId;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reservationId || !reason) {
    return NextResponse.json(
      { error: "Reservation and reason are required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [reservation] = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.householdId, session.householdId),
      ),
    );

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }
  if (reservation.memberId === session.memberId) {
    return NextResponse.json(
      { error: "You can't challenge your own reservation" },
      { status: 400 },
    );
  }
  if (reservation.startAt <= new Date()) {
    return NextResponse.json(
      { error: "This reservation has already started" },
      { status: 400 },
    );
  }

  const existing = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.reservationId, reservationId),
        inArray(challenges.status, ["pending", "queued"]),
      ),
    );

  if (existing.some((c) => c.challengerMemberId === session.memberId)) {
    return NextResponse.json(
      { error: "You already have an open challenge on this reservation" },
      { status: 409 },
    );
  }

  // First challenge is pending; later ones queue behind it in order
  const hasPending = existing.some((c) => c.status === "pending");
  const maxPosition = existing.reduce(
    (max, c) => Math.max(max, c.queuePosition),
    0,
  );

  const [created] = await db
    .insert(challenges)
    .values({
      reservationId,
      challengerMemberId: session.memberId,
      reason,
      status: hasPending ? "queued" : "pending",
      queuePosition: hasPending ? maxPosition + 1 : 0,
    })
    .returning();

  if (!hasPending) {
    const [challenger] = await db
      .select()
      .from(members)
      .where(eq(members.id, session.memberId));
    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.id, session.householdId));
    await notifyMembers([reservation.memberId], {
      type: "challenge_received",
      title: "Reservation challenged",
      body: `${challenger.name} has requested your ${formatTime(reservation.startAt, household.timezone)} reservation (${reason}). Accept or decline in the app.`,
      href: "/schedule",
    });
  }

  return NextResponse.json({ challenge: created });
}
