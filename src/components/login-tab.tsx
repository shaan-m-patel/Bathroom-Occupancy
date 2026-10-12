"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isInviteCode, isLoginCode, LIMITS, normalizeCode } from "@/lib/codes";
import { postJson } from "@/lib/client";

export function LoginTab() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteReady = isInviteCode(inviteCode);
  const loginReady = isLoginCode(loginCode);

  async function submitLogin() {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/household/login", { inviteCode, name, loginCode });
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
          onChange={(e) =>
            setInviteCode(normalizeCode(e.target.value).slice(0, LIMITS.inviteLength))
          }
          placeholder="Paste invite code"
          autoComplete="off"
          spellCheck={false}
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
          maxLength={LIMITS.memberName}
          autoComplete="given-name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="loginCode">Login code</Label>
        <Input
          id="loginCode"
          value={loginCode}
          onChange={(e) =>
            setLoginCode(normalizeCode(e.target.value).slice(0, LIMITS.loginLength))
          }
          placeholder="From your profile"
          autoComplete="off"
          spellCheck={false}
          className="font-mono tracking-widest uppercase"
        />
        <p className="text-xs text-muted-foreground">
          Use the login code saved on your profile. The invite code alone
          cannot open an existing profile.
        </p>
      </div>
      <Button
        className="w-full"
        size="lg"
        disabled={busy || !inviteReady || !loginReady || !name.trim()}
        onClick={submitLogin}
      >
        {busy ? "Logging in…" : "Log in"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
