import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { challenges, getDb, households, members, reservations } from "@/db";
import { requireSession } from "@/lib/api-auth";
import { notifyMembers } from "@/lib/notify";
import { formatTime } from "@/lib/time";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db
    .select({ challenge: challenges, reservation: reservations })
    .from(challenges)
    .innerJoin(reservations, eq(challenges.reservationId, reservations.id))
    .where(
      and(
        eq(challenges.id, id),
        eq(reservations.householdId, session.householdId),
      ),
    );

  if (!row) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }
  if (row.reservation.memberId !== session.memberId) {
    return NextResponse.json(
      { error: "Only the reservation owner can respond" },
      { status: 403 },
    );
  }
  if (row.challenge.status !== "pending") {
    return NextResponse.json(
      { error: "This challenge has already been resolved" },
      { status: 409 },
    );
  }

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, session.householdId));
  const slot = formatTime(row.reservation.startAt, household.timezone);

  await db
    .update(challenges)
    .set({
      status: action === "accept" ? "accepted" : "declined",
      resolvedAt: new Date(),
    })
    .where(eq(challenges.id, id));

  if (action === "accept") {
    // Transfer the slot to the challenger (leaves any recurring series intact)
    await db
      .update(reservations)
      .set({ memberId: row.challenge.challengerMemberId, seriesId: null, recurrenceDays: null })
      .where(eq(reservations.id, row.reservation.id));
  }

  await notifyMembers([row.challenge.challengerMemberId], {
    type: action === "accept" ? "challenge_accepted" : "challenge_declined",
    title: action === "accept" ? "Challenge accepted" : "Challenge declined",
    body:
      action === "accept"
        ? `The ${slot} reservation is now yours.`
        : `Your request for the ${slot} reservation was declined.`,
    href: "/schedule",
  });

  // Promote the next queued challenger, if any
  const [next] = await db
    .select()
    .from(challenges)
    .where(
      and(
        eq(challenges.reservationId, row.reservation.id),
        eq(challenges.status, "queued"),
      ),
    )
    .orderBy(asc(challenges.queuePosition))
    .limit(1);

  if (next) {
    await db
      .update(challenges)
      .set({ status: "pending" })
      .where(eq(challenges.id, next.id));

    const newOwnerId =
      action === "accept"
        ? row.challenge.challengerMemberId
        : row.reservation.memberId;
    const [nextChallenger] = await db
      .select()
      .from(members)
      .where(eq(members.id, next.challengerMemberId));
    await notifyMembers([newOwnerId], {
      type: "challenge_received",
      title: "Reservation challenged",
      body: `${nextChallenger.name} has requested the ${slot} reservation (${next.reason}). Accept or decline in the app.`,
      href: "/schedule",
    });
  }

  return NextResponse.json({ ok: true });
}
