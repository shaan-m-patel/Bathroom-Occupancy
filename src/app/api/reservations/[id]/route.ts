import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { getDb, members, reservations } from "@/db";
import { requireSession } from "@/lib/api-auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;

  const db = getDb();
  const [reservation] = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.id, id),
        eq(reservations.householdId, session.householdId),
      ),
    );

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  const [me] = await db
    .select()
    .from(members)
    .where(eq(members.id, session.memberId));
  if (reservation.memberId !== session.memberId && !me?.isAdmin) {
    return NextResponse.json(
      { error: "Only the owner or an admin can cancel this reservation" },
      { status: 403 },
    );
  }

  const deleteSeries =
    req.nextUrl.searchParams.get("series") === "true" && reservation.seriesId;

  if (deleteSeries) {
    await db
      .delete(reservations)
      .where(
        and(
          eq(reservations.seriesId, reservation.seriesId!),
          gte(reservations.startAt, new Date()),
        ),
      );
  } else {
    // Removing the anchor of a series stops future materialization too
    await db.delete(reservations).where(eq(reservations.id, id));
  }

  return NextResponse.json({ ok: true });
}
