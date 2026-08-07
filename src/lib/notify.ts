import { and, eq, ne } from "drizzle-orm";
import { getDb, members, notifications } from "@/db";
import { sendPushToMembers } from "@/lib/push";

/**
 * Creates in-app notification rows and mirrors them to Web Push.
 */
export async function notifyMembers(
  memberIds: string[],
  input: { type: string; title: string; body: string; href?: string },
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

  await sendPushToMembers(memberIds, {
    title: input.title,
    body: input.body,
    href: input.href,
  });
}

/** Notify every household member except the actor (e.g. "Alex checked in"). */
export async function notifyHousehold(
  householdId: string,
  excludeMemberId: string | null,
  input: { type: string; title: string; body: string; href?: string },
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
