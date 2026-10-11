import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALPHABET,
  LIMITS,
  formatCode,
  isInviteCode,
  isLoginCode,
  isReservationDuration,
  normalizeCode,
  parseEmoji,
  parseHouseholdName,
  parseMemberName,
  parseReason,
} from "./codes";
import { rotateHouseholdOrder } from "./reservations";

test("invite codes carry at least 128 bits", () => {
  const bits = LIMITS.inviteLength * Math.log2(ALPHABET.length);
  assert.ok(bits >= 128);
});

test("login codes carry at least 128 bits", () => {
  const bits = LIMITS.loginLength * Math.log2(ALPHABET.length);
  assert.ok(bits >= 128);
});

test("normalizeCode strips separators and ambiguous characters", () => {
  assert.equal(normalizeCode("ab-cd ef"), "ABCDEF");
  assert.equal(normalizeCode("o0i1l"), "");
  assert.equal(normalizeCode("  2345-6789  "), "23456789");
});

test("invite codes accept the new length and legacy 6-character codes", () => {
  assert.equal(isInviteCode("A".repeat(LIMITS.inviteLength)), true);
  assert.equal(isInviteCode("A".repeat(LIMITS.legacyInviteLength)), true);
  assert.equal(isInviteCode("A".repeat(7)), false);
  assert.equal(isLoginCode("A".repeat(LIMITS.loginLength)), true);
  assert.equal(isLoginCode("A".repeat(6)), false);
});

test("formatCode groups characters without changing them", () => {
  assert.equal(formatCode("ABCDEFGH"), "ABCD EFGH");
});

test("reservation duration enforces a five minute minimum", () => {
  assert.equal(isReservationDuration(1), false);
  assert.equal(isReservationDuration(LIMITS.minReservationMs - 1), false);
  assert.equal(isReservationDuration(LIMITS.minReservationMs), true);
  assert.equal(isReservationDuration(LIMITS.maxReservationMs), true);
  assert.equal(isReservationDuration(LIMITS.maxReservationMs + 1), false);
  assert.equal(isReservationDuration(0), false);
});

test("names, emoji, and reasons reject oversized text", () => {
  assert.equal(parseHouseholdName("  Bath  ").ok, true);
  assert.equal(parseHouseholdName("x".repeat(LIMITS.householdName + 1)).ok, false);
  assert.equal(parseMemberName("").ok, false);
  assert.equal(parseMemberName("x".repeat(LIMITS.memberName + 1)).ok, false);
  assert.equal(parseEmoji("🙂").ok, true);
  assert.equal(parseEmoji("x".repeat(LIMITS.emoji + 1)).ok, false);
  assert.deepEqual(parseReason("  shower  "), { ok: true, reason: "shower" });
  assert.equal(parseReason("x".repeat(LIMITS.reason + 1)).ok, false);
});

test("household rotation changes which household is first", () => {
  const ids = ["a", "b", "c", "d"];
  assert.deepEqual(rotateHouseholdOrder(ids, 0), ids);
  assert.deepEqual(rotateHouseholdOrder(ids, 86_400_000), ["b", "c", "d", "a"]);
  assert.deepEqual(rotateHouseholdOrder([], 86_400_000), []);
});
