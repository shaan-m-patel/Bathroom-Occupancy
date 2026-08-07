// Push preference categories shown on the profile page. A member's
// notificationPrefs stores `key: false` to mute a category; missing = enabled.

export const NOTIFICATION_CATEGORIES = [
  {
    key: "checked_in",
    label: "Check-ins",
    description: "When someone checks into the bathroom",
  },
  {
    key: "bathroom_available",
    label: "Bathroom available",
    description: "When the bathroom frees up",
  },
  {
    key: "time_extended",
    label: "Time extensions",
    description: "When someone adds more time",
  },
  {
    key: "session_expired",
    label: "Session ended",
    description: "When your own estimated time runs out",
  },
  {
    key: "reservation_reminder",
    label: "Reservation reminders",
    description: "10 minutes before your reservation",
  },
  {
    key: "challenges",
    label: "Challenges",
    description: "Reservation challenges and responses",
  },
] as const;

export type NotificationCategoryKey =
  (typeof NOTIFICATION_CATEGORIES)[number]["key"];

// Maps a notification `type` to its preference category. Types not listed
// here (e.g. waitlist pings the member explicitly asked for) always push.
const CATEGORY_BY_TYPE: Record<string, NotificationCategoryKey> = {
  checked_in: "checked_in",
  bathroom_available: "bathroom_available",
  time_extended: "time_extended",
  session_expired: "session_expired",
  reservation_reminder: "reservation_reminder",
  challenge_received: "challenges",
  challenge_accepted: "challenges",
  challenge_declined: "challenges",
};

export function isCategoryKey(key: string): key is NotificationCategoryKey {
  return NOTIFICATION_CATEGORIES.some((c) => c.key === key);
}

export function pushAllowedByPrefs(
  type: string,
  prefs: Record<string, boolean>,
) {
  const category = CATEGORY_BY_TYPE[type];
  return category === undefined || prefs[category] !== false;
}

/** Minutes since midnight in the given IANA timezone, right now. */
export function minutesOfDayIn(timezone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** Supports overnight windows (e.g. 22:00–07:00); start === end is disabled. */
export function inQuietHours(
  start: number | null,
  end: number | null,
  timezone: string,
) {
  if (start === null || end === null || start === end) return false;
  const now = minutesOfDayIn(timezone);
  return start < end ? now >= start && now < end : now >= start || now < end;
}
