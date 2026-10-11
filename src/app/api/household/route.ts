import { NextRequest, NextResponse } from "next/server";
import { getDb, households, members } from "@/db";
import { createSessionCookie } from "@/lib/auth";
import {
  parseColor,
  parseEmoji,
  parseHouseholdName,
  parseMemberName,
  parseTimezone,
} from "@/lib/codes";
import { clientIp, readJsonBody, tooManyResponse } from "@/lib/http";
import { toPublicMember } from "@/lib/public-member";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { generateInviteCode, generateLoginCode, hashLoginCode } from "@/lib/secrets";

export async function POST(req: NextRequest) {
  const ipLimit = await consumeRateLimit(
    `create:ip:${clientIp(req)}`,
    RATE_LIMITS.createHouseholdIp.limit,
    RATE_LIMITS.createHouseholdIp.windowMs,
  );
  if (!ipLimit.allowed) return tooManyResponse(ipLimit.retryAfterSec);

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const householdName = parseHouseholdName(body?.householdName);
  if (!householdName.ok) {
    return NextResponse.json({ error: householdName.error }, { status: 400 });
  }
  const name = parseMemberName(body?.name);
  if (!name.ok) {
    return NextResponse.json({ error: name.error }, { status: 400 });
  }
  const emoji = parseEmoji(body?.emoji);
  if (!emoji.ok) {
    return NextResponse.json({ error: emoji.error }, { status: 400 });
  }

  const db = getDb();
  const loginCode = generateLoginCode();

  // Retry in the unlikely event of an invite code collision
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [household] = await db
        .insert(households)
        .values({
          name: householdName.name,
          inviteCode: generateInviteCode(),
          timezone: parseTimezone(body?.timezone),
        })
        .returning();

      const [member] = await db
        .insert(members)
        .values({
          householdId: household.id,
          name: name.name,
          emoji: emoji.emoji,
          color: parseColor(body?.color),
          isAdmin: true,
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
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }

  return NextResponse.json({ error: "Could not create household" }, { status: 500 });
}
