"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/client";

type PreviewMember = { id: string; name: string };

export function LoginTab() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitLogin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/household/preview?code=${inviteCode}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Invalid invite code");
      }
      const wanted = name.trim().toLowerCase();
      const member = (data.members as PreviewMember[]).find(
        (m) => m.name.trim().toLowerCase() === wanted,
      );
      if (!member) {
        setError(
          `No one named "${name.trim()}" in this household — try the Join tab`,
        );
        setBusy(false);
        return;
      }
      await postJson("/api/household/join", {
        inviteCode,
        claimMemberId: member.id,
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="loginInviteCode">Invite code</Label>
        <Input
          id="loginInviteCode"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          className="font-mono tracking-widest uppercase"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="loginName">Your name</Label>
        <Input
          id="loginName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex"
          autoComplete="given-name"
        />
        <p className="text-xs text-muted-foreground">
          Use the name of your existing profile in the household.
        </p>
      </div>
      <Button
        className="w-full"
        size="lg"
        disabled={busy || inviteCode.length !== 6 || !name.trim()}
        onClick={submitLogin}
      >
        {busy ? "Logging in…" : "Log in"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
