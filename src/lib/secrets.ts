import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { ALPHABET, LIMITS } from "@/lib/codes";

const REJECTION_LIMIT = 256 - (256 % ALPHABET.length);

/**
 * Cryptographic code from the unambiguous alphabet. Bytes that would bias
 * modulo sampling are discarded.
 */
export function generateSecret(length: number) {
  let code = "";
  while (code.length < length) {
    const bytes = randomBytes(64);
    for (const byte of bytes) {
      if (byte >= REJECTION_LIMIT) continue;
      code += ALPHABET[byte % ALPHABET.length];
      if (code.length === length) break;
    }
  }
  return code;
}

export function generateInviteCode() {
  return generateSecret(LIMITS.inviteLength);
}

export function generateLoginCode() {
  return generateSecret(LIMITS.loginLength);
}

export function hashLoginCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function loginCodesMatch(code: string, hash: string) {
  const actual = createHash("sha256").update(code).digest();
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}

function digestEqual(a: string, b: string) {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

/**
 * Authorizes a cron request. A missing or empty secret never matches, including
 * the literal "Bearer undefined" produced by interpolating an unset env var.
 */
export function cronAuthorized(
  authorization: string | null,
  secret: string | undefined,
) {
  if (typeof secret !== "string" || secret.trim().length === 0) return false;
  return digestEqual(authorization ?? "", `Bearer ${secret}`);
}
