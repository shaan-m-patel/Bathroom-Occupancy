import { and, asc, eq, gt, gte, isNull, lte, lt, sql } from "drizzle-orm";
import {
  getDb,
  members,
  notifications,
  occupancySessions,
  reservations,
  waitlistEntries,
} from "@/db";
import { notifyBathroomAvailable, notifyMembers } from "@/lib/notify";

/**
 * Lazy expiry: any active session whose estimate has passed is closed at its
 * expected end time. Runs on every status poll so no cron is needed.
 */
export async function expireStaleSessions(householdId: string) {
  const db = getDb();
  const expired = await db
    .update(occupancySessions)
    .set({
      endedAt: sql`${occupancySessions.expectedEndAt}`,
      autoExpired: true,
    })
    .where(
      and(
        eq(occupancySessions.householdId, householdId),
        isNull(occupancySessions.endedAt),
        lte(occupancySessions.expectedEndAt, new Date()),
      ),
    )
    .returning();

  for (const session of expired) {
    await notifyMembers([session.memberId], {
      type: "session_expired",
      title: "Bathroom session ended",
      body: "Your estimated bathroom session has ended. If you're still inside, check in again.",
    });
    await notifyBathroomAvailable(
      householdId,
      session.memberId,
      "The bathroom is now available.",
    );
  }
}

/**
 * Opportunistic dispatch of "reservation starts in 10 minutes" reminders,
 * piggybacked on status polls.
 */
export async function dispatchReservationReminders(householdId: string) {
  const db = getDb();
  const now = new Date();
  const soon = new Date(now.getTime() + 10 * 60 * 1000);

  const due = await db
    .update(reservations)
    .set({ reminderSentAt: now })
    .where(
      and(
        eq(reservations.householdId, householdId),
        isNull(reservations.reminderSentAt),
        gt(reservations.startAt, now),
        lte(reservations.startAt, soon),
      ),
    )
    .returning();

  for (const r of due) {
    const minutes = Math.max(
      1,
      Math.round((r.startAt.getTime() - now.getTime()) / 60000),
    );
    await notifyMembers([r.memberId], {
      type: "reservation_reminder",
      title: "Upcoming reservation",
      body: `Your bathroom reservation starts in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      href: "/schedule",
    });
  }
}

export async function getStatusPayload(
  memberId: string,
  householdId: string,
  window?: { from: Date; to: Date },
) {
  const db = getDb();

  await expireStaleSessions(householdId);
  await dispatchReservationReminders(householdId);

  const [currentRows, householdMembers, unreadRows, waiting] = await Promise.all([
    db
      .select({
        session: occupancySessions,
        member: members,
      })
      .from(occupancySessions)
      .innerJoin(members, eq(occupancySessions.memberId, members.id))
      .where(
        and(
          eq(occupancySessions.householdId, householdId),
          isNull(occupancySessions.endedAt),
        ),
      )
      .orderBy(asc(occupancySessions.startedAt))
      .limit(1),
    db.select().from(members).where(eq(members.householdId, householdId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(eq(notifications.memberId, memberId), isNull(notifications.readAt)),
      ),
    db
      .select({ memberId: waitlistEntries.memberId })
      .from(waitlistEntries)
      .where(eq(waitlistEntries.householdId, householdId)),
  ]);

  let windowReservations: Array<{
    reservation: typeof reservations.$inferSelect;
    member: typeof members.$inferSelect;
  }> = [];
  if (window) {
    windowReservations = await db
      .select({ reservation: reservations, member: members })
      .from(reservations)
      .innerJoin(members, eq(reservations.memberId, members.id))
      .where(
        and(
          eq(reservations.householdId, householdId),
          gte(reservations.startAt, window.from),
          lt(reservations.startAt, window.to),
        ),
      )
      .orderBy(asc(reservations.startAt));
  }

  return {
    now: new Date().toISOString(),
    meId: memberId,
    occupancy: currentRows[0] ?? null,
    members: householdMembers,
    reservations: windowReservations,
    unreadCount: unreadRows[0]?.count ?? 0,
    waitingCount: waiting.length,
    amWaiting: waiting.some((w) => w.memberId === memberId),
  };
}
