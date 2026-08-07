import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getStatusPayload } from "@/lib/status";

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession();
  if (error) return error;

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  let window: { from: Date; to: Date } | undefined;
  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      window = { from, to };
    }
  }

  const payload = await getStatusPayload(
    session.memberId,
    session.householdId,
    window,
  );
  return NextResponse.json(payload);
}
