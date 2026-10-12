import assert from "node:assert/strict";
import { test } from "node:test";
import { ALPHABET, LIMITS } from "./codes";
import {
  cronAuthorized,
  generateInviteCode,
  generateLoginCode,
  hashLoginCode,
  loginCodesMatch,
} from "./secrets";

test("generated codes use the unambiguous alphabet and full length", () => {
  const codes = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const invite = generateInviteCode();
    const login = generateLoginCode();
    assert.equal(invite.length, LIMITS.inviteLength);
    assert.equal(login.length, LIMITS.loginLength);
    for (const char of invite + login) {
      assert.ok(ALPHABET.includes(char));
    }
    codes.add(invite);
  }
  assert.equal(codes.size, 20);
});

test("login codes match only their own hash", () => {
  const code = generateLoginCode();
  const hash = hashLoginCode(code);
  assert.equal(loginCodesMatch(code, hash), true);
  assert.equal(loginCodesMatch(generateLoginCode(), hash), false);
  assert.equal(loginCodesMatch(code, "ab"), false);
  assert.equal(loginCodesMatch(code, ""), false);
});

test("missing or empty cron secrets are rejected", () => {
  assert.equal(cronAuthorized("Bearer undefined", undefined), false);
  assert.equal(cronAuthorized("Bearer ", ""), false);
  assert.equal(cronAuthorized("Bearer ", "   "), false);
  assert.equal(cronAuthorized(null, undefined), false);
});

test("cron authorization compares the full bearer token", () => {
  assert.equal(cronAuthorized("Bearer s3cret", "s3cret"), true);
  assert.equal(cronAuthorized("Bearer s3cret ", "s3cret"), false);
  assert.equal(cronAuthorized("bearer s3cret", "s3cret"), false);
  assert.equal(cronAuthorized(null, "s3cret"), false);
  assert.equal(cronAuthorized("Bearer other", "s3cret"), false);
});
