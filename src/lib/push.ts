import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { getDb, pushSubscriptions } from "@/db";

let configured = false;

function ensureConfigured() {
  if (configured) return false;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return true;
  // Apple rejects invalid contact URIs (e.g. fake TLDs) with 403 BadJwtToken
  webpush.setVapidDetails("https://bathroom-status.vercel.app", publicKey, privateKey);
  configured = true;
  return false;
}

export async function sendPushToMembers(
  memberIds: string[],
  payload: { title: string; body: string; href?: string },
) {
  if (memberIds.length === 0 || ensureConfigured()) return;

  const db = getDb();
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.memberId, memberIds));

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
        );
      } catch (err) {
        // Subscription expired or revoked — clean it up
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, sub.endpoint));
        } else {
          console.error(
            `Push send failed (${statusCode ?? "unknown"}) for ${sub.endpoint.slice(0, 40)}:`,
            (err as { body?: string }).body ?? err,
          );
        }
      }
    }),
  );
}
