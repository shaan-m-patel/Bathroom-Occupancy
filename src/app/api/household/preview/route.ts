import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, households } from "@/db";
import { isInviteCode, normalizeCode } from "@/lib/codes";
import { clientIp, tooManyResponse } from "@/lib/http";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// Confirms a household name for someone joining with an invite code.
// Member ids and names are not returned; the code is not a login.
export async function GET(req: NextRequest) {
  const ipLimit = await consumeRateLimit(
    `preview:ip:${clientIp(req)}`,
    RATE_LIMITS.previewIp.limit,
    RATE_LIMITS.previewIp.windowMs,
  );
  if (!ipLimit.allowed) return tooManyResponse(ipLimit.retryAfterSec);

  const code = normalizeCode(req.nextUrl.searchParams.get("code") ?? "");
  if (!isInviteCode(code)) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  const db = getDb();
  const [household] = await db
    .select({ id: households.id, name: households.name })
    .from(households)
    .where(eq(households.inviteCode, code));
  if (!household) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const householdLimit = await consumeRateLimit(
    `preview:hh:${household.id}`,
    RATE_LIMITS.previewHousehold.limit,
    RATE_LIMITS.previewHousehold.windowMs,
  );
  if (!householdLimit.allowed) return tooManyResponse(householdLimit.retryAfterSec);

  return NextResponse.json({
    household: { name: household.name },
  });
}
