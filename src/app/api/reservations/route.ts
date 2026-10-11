import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gt, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { challenges, getDb, members, reservations } from "@/db";
import { requireSession } from "@/lib/api-auth";
import { isReservationDuration, LIMITS, parseReason } from "@/lib/codes";
import { readJsonBody, tooManyResponse } from "@/lib/http";
import { toPublicMember } from "@/lib/public-member";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
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
      reservation: r.reservation,
      member: toPublicMember(r.member),
      challenges: challengeRows.filter(
        (c) => c.reservationId === r.reservation.id,
      ),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const limited = await consumeRateLimit(
    `reserve:hh:${session.householdId}`,
    RATE_LIMITS.reservationHousehold.limit,
    RATE_LIMITS.reservationHousehold.windowMs,
  );
  if (!limited.allowed) return tooManyResponse(limited.retryAfterSec);

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const startAt = new Date(typeof body?.startAt === "string" ? body.startAt : "");
  const endAt = new Date(typeof body?.endAt === "string" ? body.endAt : "");
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
  if (!isReservationDuration(durationMs)) {
    return NextResponse.json(
      { error: "Reservations must be between 5 minutes and 4 hours" },
      { status: 400 },
    );
  }
  const recurrenceDays =
    Number.isInteger(body?.recurrenceDays) &&
    (body?.recurrenceDays as number) > 0 &&
    (body?.recurrenceDays as number) < 128
      ? (body?.recurrenceDays as number)
      : null;
  const reason = parseReason(body?.reason);
  if (!reason.ok) {
    return NextResponse.json({ error: reason.error }, { status: 400 });
  }

  const db = getDb();
  const now = new Date();
  const [future, series] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(
        and(
          eq(reservations.householdId, session.householdId),
          gt(reservations.endAt, now),
        ),
      ),
    recurrenceDays
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(reservations)
          .where(
            and(
              eq(reservations.householdId, session.householdId),
              isNotNull(reservations.recurrenceDays),
            ),
          )
      : Promise.resolve([{ count: 0 }]),
  ]);
  const futureCount = Number(future[0]?.count ?? 0);
  const projected = recurrenceDays ? LIMITS.seriesOccurrenceBudget : 1;
  if (futureCount + projected > LIMITS.maxFutureReservations) {
    return NextResponse.json(
      { error: "This household already has too many upcoming reservations" },
      { status: 400 },
    );
  }
  if (recurrenceDays && Number(series[0]?.count ?? 0) >= LIMITS.maxActiveSeries) {
    return NextResponse.json(
      { error: "This household already has too many repeating reservations" },
      { status: 400 },
    );
  }

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
      reason: reason.reason,
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
