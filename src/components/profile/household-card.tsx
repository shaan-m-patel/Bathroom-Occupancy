"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCode, LIMITS } from "@/lib/codes";
import type { MemberDto } from "@/lib/types";

export function HouseholdCard({
  name,
  inviteCode,
  members,
  meId,
  isAdmin,
  membersWithoutLoginCode,
}: {
  name: string;
  inviteCode: string;
  members: MemberDto[];
  meId: string;
  isAdmin: boolean;
  membersWithoutLoginCode: number;
}) {
  const router = useRouter();
  const [code, setCode] = useState(inviteCode);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function rotate() {
    const warning =
      membersWithoutLoginCode > 0
        ? `Rotate the invite code? Everyone will be signed out. ${membersWithoutLoginCode} member${membersWithoutLoginCode === 1 ? "" : "s"} still need a login code to get back in.`
        : "Rotate the invite code? Everyone will be signed out and will need their login code to return.";
    if (!window.confirm(warning)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/household/invite", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not rotate invite code");
      setCode(data.inviteCode);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rotate invite code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-4 rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{name}</h2>
          <p className="text-xs text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={copy}>
          {copied ? "Copied ✓" : "Copy code"}
        </Button>
      </div>

      <p className="break-all font-mono text-sm tracking-widest">{formatCode(code)}</p>

      {code.length < LIMITS.inviteLength && (
        <p className="text-xs text-destructive">
          This invite code is short enough to guess. An admin should rotate it.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm"
            style={{ borderColor: `${m.color}66`, backgroundColor: `${m.color}1a` }}
          >
            <span>{m.emoji}</span>
            <span className="font-medium">
              {m.id === meId ? "You" : m.name}
            </span>
            {m.isAdmin && (
              <span className="text-[10px] text-muted-foreground">admin</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Share the invite code so someone can create a new profile. Signing back
        into an existing profile also requires that person&apos;s login code.
      </p>

      {isAdmin && (
        <Button
          variant="outline"
          className="rounded-xl"
          disabled={busy}
          onClick={rotate}
        >
          {busy ? "Rotating…" : "Rotate invite code"}
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </Card>
  );
}
