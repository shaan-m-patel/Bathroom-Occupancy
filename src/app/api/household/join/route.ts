import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, households, members } from "@/db";
import { createSessionCookie } from "@/lib/auth";
import {
  isInviteCode,
  normalizeCode,
  parseColor,
  parseEmoji,
  parseMemberName,
} from "@/lib/codes";
import { clientIp, readJsonBody, tooManyResponse } from "@/lib/http";
import { toPublicMember } from "@/lib/public-member";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { generateLoginCode, hashLoginCode } from "@/lib/secrets";

// The invite code only creates a new member. It cannot sign the caller in as
// someone who already belongs to the household.
export async function POST(req: NextRequest) {
  const ipLimit = await consumeRateLimit(
    `join:ip:${clientIp(req)}`,
    RATE_LIMITS.joinIp.limit,
    RATE_LIMITS.joinIp.windowMs,
  );
  if (!ipLimit.allowed) return tooManyResponse(ipLimit.retryAfterSec);

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const inviteCode = normalizeCode(
    typeof body?.inviteCode === "string" ? body.inviteCode : "",
  );
  const name = parseMemberName(body?.name);
  if (!isInviteCode(inviteCode)) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }
  if (!name.ok) {
    return NextResponse.json({ error: name.error }, { status: 400 });
  }
  const emoji = parseEmoji(body?.emoji);
  if (!emoji.ok) {
    return NextResponse.json({ error: emoji.error }, { status: 400 });
  }

  const db = getDb();
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, inviteCode));

  if (!household) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const householdLimit = await consumeRateLimit(
    `join:hh:${household.id}`,
    RATE_LIMITS.joinHousehold.limit,
    RATE_LIMITS.joinHousehold.windowMs,
  );
  if (!householdLimit.allowed) return tooManyResponse(householdLimit.retryAfterSec);

  const loginCode = generateLoginCode();
  const [member] = await db
    .insert(members)
    .values({
      householdId: household.id,
      name: name.name,
      emoji: emoji.emoji,
      color: parseColor(body?.color),
      loginCodeHash: hashLoginCode(loginCode),
    })
    .returning();

  await createSessionCookie(
    { memberId: member.id, householdId: household.id },
    household.sessionVersion,
  );

  return NextResponse.json({
    household,
    member: toPublicMember(member),
    loginCode,
  });
}
