import { NextRequest, NextResponse } from "next/server";
import { LIMITS } from "@/lib/codes";

export function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const raw =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return raw.slice(0, 64);
}

export function tooManyResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many attempts. Try again in a few minutes." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSec)) },
    },
  );
}

export async function readJsonBody(
  req: NextRequest,
  maxBytes = LIMITS.jsonBody,
): Promise<
  | { ok: true; body: Record<string, unknown> | null }
  | { ok: false; response: NextResponse }
> {
  const declared = req.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Request too large" },
        { status: 413 },
      ),
    };
  }

  const text = await req.text();
  if (text.length > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Request too large" },
        { status: 413 },
      ),
    };
  }
  if (!text) return { ok: true, body: null };

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: true, body: null };
    }
    return { ok: true, body: parsed as Record<string, unknown> };
  } catch {
    return { ok: true, body: null };
  }
}
