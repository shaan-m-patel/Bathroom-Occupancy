import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { challenges, getDb, members, reservations } from "@/db";
import { requireSession } from "@/lib/api-auth";
import {
  findOverlap,
  materializeSeries,
  suggestNearestSlot,
} from "@/lib/reservations";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const from = new Date(req.nextUrl.searchParams.get("from") ?? "");
  const to = new Date(req.nextUrl.searchParams.get("to") ?? "");
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select({ reservation: reservations, member: members })
    .from(reservations)
    .innerJoin(members, eq(reservations.memberId, members.id))
    .where(
      and(
        eq(reservations.householdId, session.householdId),
        gte(reservations.startAt, from),
        lt(reservations.startAt, to),
      ),
    )
    .orderBy(asc(reservations.startAt));

  const ids = rows.map((r) => r.reservation.id);
  const challengeRows = ids.length
    ? await db
        .select()
        .from(challenges)
        .where(inArray(challenges.reservationId, ids))
        .orderBy(asc(challenges.createdAt))
    : [];

  return NextResponse.json({
    reservations: rows.map((r) => ({
      ...r,
      challenges: challengeRows.filter(
        (c) => c.reservationId === r.reservation.id,
      ),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const startAt = new Date(body?.startAt ?? "");
  const endAt = new Date(body?.endAt ?? "");
  if (isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
  }
  if (startAt <= new Date()) {
    return NextResponse.json(
      { error: "Reservations must be in the future" },
      { status: 400 },
    );
  }
  const durationMs = endAt.getTime() - startAt.getTime();
  if (durationMs <= 0 || durationMs > 4 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: "Reservations must be between 5 minutes and 4 hours" },
      { status: 400 },
    );
  }
  const recurrenceDays =
    Number.isInteger(body?.recurrenceDays) &&
    body.recurrenceDays > 0 &&
    body.recurrenceDays < 128
      ? (body.recurrenceDays as number)
      : null;
  const reason =
    typeof body?.reason === "string" ? body.reason.trim() || null : null;

  const db = getDb();
  const overlaps = await findOverlap(session.householdId, startAt, endAt);
  if (overlaps.length > 0) {
    const suggestion = await suggestNearestSlot(
      session.householdId,
      startAt,
      endAt,
    );
    return NextResponse.json(
      {
        error: "That time overlaps an existing reservation",
        suggestion: suggestion
          ? {
              startAt: suggestion.startAt.toISOString(),
              endAt: suggestion.endAt.toISOString(),
            }
          : null,
      },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(reservations)
    .values({
      householdId: session.householdId,
      memberId: session.memberId,
      startAt,
      endAt,
      reason,
      recurrenceDays,
    })
    .returning();

  if (recurrenceDays) {
    const [anchor] = await db
      .update(reservations)
      .set({ seriesId: created.id })
      .where(eq(reservations.id, created.id))
      .returning();
    await materializeSeries(anchor);
  }

  return NextResponse.json({ reservation: created });
}
