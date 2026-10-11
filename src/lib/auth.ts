import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb, households } from "@/db";

const COOKIE_NAME = "bs_session";

export type Session = {
  memberId: string;
  householdId: string;
};

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET!);
}

export async function createSessionCookie(
  session: Session,
  sessionVersion: number,
) {
  const token = await new SignJWT({ ...session, sv: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.memberId !== "string" || typeof payload.householdId !== "string") {
      return null;
    }
    // Tokens issued before session versions existed are treated as version 0.
    // Rotating the invite code bumps the household version and invalidates them.
    const sv = payload.sv === undefined ? 0 : payload.sv;
    if (typeof sv !== "number" || !Number.isInteger(sv)) return null;

    const db = getDb();
    const [household] = await db
      .select({ sessionVersion: households.sessionVersion })
      .from(households)
      .where(eq(households.id, payload.householdId));
    if (!household || household.sessionVersion !== sv) return null;

    return { memberId: payload.memberId, householdId: payload.householdId };
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
