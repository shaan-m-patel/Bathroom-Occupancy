import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getDb, households, members } from "@/db";
import { createSessionCookie } from "@/lib/auth";
import { isInviteCode, isLoginCode, normalizeCode, parseMemberName } from "@/lib/codes";
import { clientIp, readJsonBody, tooManyResponse } from "@/lib/http";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { hashLoginCode, loginCodesMatch } from "@/lib/secrets";

const DUMMY_HASH = hashLoginCode("not-a-real-login-code");

export async function POST(req: NextRequest) {
  const ipLimit = await consumeRateLimit(
    `login:ip:${clientIp(req)}`,
    RATE_LIMITS.loginIp.limit,
    RATE_LIMITS.loginIp.windowMs,
  );
  if (!ipLimit.allowed) return tooManyResponse(ipLimit.retryAfterSec);

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const inviteCode = normalizeCode(
    typeof body?.inviteCode === "string" ? body.inviteCode : "",
  );
  const loginCode = normalizeCode(
    typeof body?.loginCode === "string" ? body.loginCode : "",
  );
  const name = parseMemberName(body?.name);
  if (!isInviteCode(inviteCode) || !isLoginCode(loginCode) || !name.ok) {
    return NextResponse.json(
      { error: "Invite code, name, and login code are required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, inviteCode));
  if (!household) {
    loginCodesMatch(loginCode, DUMMY_HASH);
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const householdLimit = await consumeRateLimit(
    `login:hh:${household.id}`,
    RATE_LIMITS.loginHousehold.limit,
    RATE_LIMITS.loginHousehold.windowMs,
  );
  if (!householdLimit.allowed) return tooManyResponse(householdLimit.retryAfterSec);

  const candidates = await db
    .select()
    .from(members)
    .where(
      sql`${members.householdId} = ${household.id} and lower(${members.name}) = lower(${name.name})`,
    );

  const match =
    candidates.find(
      (member) =>
        member.loginCodeHash && loginCodesMatch(loginCode, member.loginCodeHash),
    ) ?? null;
  if (!match) {
    loginCodesMatch(loginCode, DUMMY_HASH);
    return NextResponse.json(
      { error: "Name or login code is incorrect" },
      { status: 401 },
    );
  }

  await createSessionCookie(
    { memberId: match.id, householdId: household.id },
    household.sessionVersion,
  );

  return NextResponse.json({ ok: true });
}
