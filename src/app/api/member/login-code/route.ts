import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, members } from "@/db";
import { requireSession } from "@/lib/api-auth";
import { generateLoginCode, hashLoginCode } from "@/lib/secrets";

export async function POST() {
  const { session, error } = await requireSession();
  if (error) return error;

  const loginCode = generateLoginCode();
  const db = getDb();
  const [updated] = await db
    .update(members)
    .set({ loginCodeHash: hashLoginCode(loginCode) })
    .where(eq(members.id, session.memberId))
    .returning({ id: members.id });
  if (!updated) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  return NextResponse.json({ loginCode });
}
