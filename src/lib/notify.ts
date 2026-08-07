import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb, households, members, notifications, waitlistEntries } from "@/db";
import {
  inQuietHours,
  pushAllowedByPrefs,
} from "@/lib/notification-prefs";
import { sendPushToMembers } from "@/lib/push";

type NotificationInput = {
  type: string;
  title: string;
  body: string;
  href?: string;
  /** Skip preference and quiet-hours checks (member explicitly asked). */
  urgent?: boolean;
};

/**
 * Creates in-app notification rows and mirrors them to Web Push. The in-app
 * feed always gets the row; push delivery respects each member's category
 * preferences and quiet hours unless the notification is urgent.
 */
export async function notifyMembers(
  memberIds: string[],
  input: NotificationInput,
) {
  if (memberIds.length === 0) return;
  const db = getDb();

  await db.insert(notifications).values(
    memberIds.map((memberId) => ({
      memberId,
      type: input.type,
      body: input.body,
      href: input.href,
    })),
  );

  let pushIds = memberIds;
  if (!input.urgent) {
    const rows = await db
      .select({
        id: members.id,
        prefs: members.notificationPrefs,
        quietStart: members.quietHoursStart,
        quietEnd: members.quietHoursEnd,
        timezone: households.timezone,
      })
      .from(members)
      .innerJoin(households, eq(members.householdId, households.id))
      .where(inArray(members.id, memberIds));

    pushIds = rows
      .filter(
        (r) =>
          pushAllowedByPrefs(input.type, r.prefs) &&
          !inQuietHours(r.quietStart, r.quietEnd, r.timezone),
      )
      .map((r) => r.id);
  }

  await sendPushToMembers(pushIds, {
    title: input.title,
    body: input.body,
    href: input.href,
  });
}

/** Notify every household member except the actor (e.g. "Alex checked in"). */
export async function notifyHousehold(
  householdId: string,
  excludeMemberId: string | null,
  input: NotificationInput,
) {
  const db = getDb();
  const rows = await db
    .select({ id: members.id })
    .from(members)
    .where(
      excludeMemberId
        ? and(
            eq(members.householdId, householdId),
            ne(members.id, excludeMemberId),
          )
        : eq(members.householdId, householdId),
    );
  await notifyMembers(
    rows.map((r) => r.id),
    input,
  );
}

/**
 * The bathroom just opened up: ping waitlisted members urgently, tell the
 * rest of the household normally, then clear the waitlist.
 */
export async function notifyBathroomAvailable(
  householdId: string,
  actorMemberId: string,
  body: string,
) {
  const db = getDb();
  const waiting = await db
    .delete(waitlistEntries)
    .where(eq(waitlistEntries.householdId, householdId))
    .returning({ memberId: waitlistEntries.memberId });
  const waitingIds = waiting
    .map((w) => w.memberId)
    .filter((id) => id !== actorMemberId);

  if (waitingIds.length > 0) {
    await notifyMembers(waitingIds, {
      type: "waitlist_available",
      title: "Your turn!",
      body: "The bathroom is free — you asked to be notified.",
      urgent: true,
    });
  }

  const rest = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.householdId, householdId));
  const skip = new Set([actorMemberId, ...waitingIds]);
  await notifyMembers(
    rest.map((r) => r.id).filter((id) => !skip.has(id)),
    { type: "bathroom_available", title: "Bathroom available", body },
  );
}
