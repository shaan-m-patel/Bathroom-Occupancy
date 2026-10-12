// Unambiguous uppercase alphabet (no 0/O, 1/I/L). 31 symbols.
export const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const LIMITS = {
  householdName: 80,
  memberName: 40,
  emoji: 32,
  reason: 200,
  timezone: 64,
  jsonBody: 8_192,
  // 26 symbols from a 31-character alphabet is log2(31^26) ≈ 128.8 bits.
  inviteLength: 26,
  legacyInviteLength: 6,
  loginLength: 26,
  minReservationMs: 5 * 60 * 1000,
  maxReservationMs: 4 * 60 * 60 * 1000,
  maxFutureReservations: 200,
  maxActiveSeries: 20,
  // A new weekly series materializes at most one row per day in the window.
  seriesOccurrenceBudget: 15,
  seriesPerHouseholdPerRun: 20,
  seriesPerCronRun: 60,
  // Skip cron materialization for a household above this many future rows so
  // one household's volume cannot stall maintenance for the others.
  maintenanceRowBudget: 500,
} as const;

const ALPHABET_SET = new Set(ALPHABET.split(""));

/** Strips separators and letters outside the invite alphabet. */
export function normalizeCode(raw: string) {
  let code = "";
  for (const char of raw.toUpperCase()) {
    if (ALPHABET_SET.has(char)) code += char;
  }
  return code;
}

export function isInviteCode(code: string) {
  return (
    code.length === LIMITS.inviteLength ||
    code.length === LIMITS.legacyInviteLength
  );
}

export function isLoginCode(code: string) {
  return code.length === LIMITS.loginLength;
}

export function formatCode(code: string) {
  return code.replace(/(.{4})/g, "$1 ").trim();
}

export function isReservationDuration(durationMs: number) {
  return (
    durationMs >= LIMITS.minReservationMs &&
    durationMs <= LIMITS.maxReservationMs
  );
}

export function parseHouseholdName(
  value: unknown,
): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "Household name is required" };
  }
  const name = value.trim();
  if (name.length > LIMITS.householdName) {
    return { ok: false, error: "Household name is too long" };
  }
  return { ok: true, name };
}

export function parseMemberName(
  value: unknown,
): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: "Your name is required" };
  }
  const name = value.trim();
  if (name.length > LIMITS.memberName) {
    return { ok: false, error: "Name is too long" };
  }
  return { ok: true, name };
}

export function parseEmoji(
  value: unknown,
): { ok: true; emoji: string } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, emoji: "🙂" };
  if (typeof value !== "string") return { ok: false, error: "Invalid emoji" };
  const emoji = value.trim();
  if (!emoji) return { ok: true, emoji: "🙂" };
  if (emoji.length > LIMITS.emoji) {
    return { ok: false, error: "Emoji is too long" };
  }
  return { ok: true, emoji };
}

export function parseColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value
    : "#3b82f6";
}

export function parseTimezone(value: unknown) {
  if (typeof value !== "string") return "UTC";
  const timezone = value.trim();
  if (!timezone || timezone.length >= LIMITS.timezone) return "UTC";
  return timezone;
}

export function parseReason(
  value: unknown,
): { ok: true; reason: string | null } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, reason: null };
  if (typeof value !== "string") {
    return { ok: false, error: "Invalid reason" };
  }
  const reason = value.trim();
  if (!reason) return { ok: true, reason: null };
  if (reason.length > LIMITS.reason) {
    return { ok: false, error: "Reason is too long" };
  }
  return { ok: true, reason };
}
