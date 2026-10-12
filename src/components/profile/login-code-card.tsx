"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCode } from "@/lib/codes";

export function LoginCodeCard({ hasLoginCode }: { hasLoginCode: boolean }) {
  const router = useRouter();
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rotate() {
    if (
      hasLoginCode &&
      !window.confirm(
        "Replace your login code? The previous code will stop working.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/member/login-code", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create a login code");
      setLoginCode(data.loginCode);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create a login code");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!loginCode) return;
    await navigator.clipboard.writeText(loginCode);
    setCopied(true);
  }

  return (
    <Card className="gap-3 rounded-3xl p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">Login code</h2>
        <p className="text-xs text-muted-foreground">
          {hasLoginCode
            ? "A login code is set for this profile. Replace it if you need to see it again. The new code is shown once."
            : "Create a login code so you can sign back in on another device. It is shown once."}
        </p>
      </div>

      {loginCode && (
        <p className="break-all rounded-2xl bg-muted/50 p-3 text-center font-mono text-sm tracking-widest">
          {formatCode(loginCode)}
        </p>
      )}

      <div className="flex gap-2">
        <Button className="rounded-xl" disabled={busy} onClick={rotate}>
          {busy
            ? "Saving…"
            : loginCode
              ? "Generate another"
              : hasLoginCode
                ? "Replace login code"
                : "Create login code"}
        </Button>
        {loginCode && (
          <Button variant="outline" className="rounded-xl" onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </Card>
  );
}
