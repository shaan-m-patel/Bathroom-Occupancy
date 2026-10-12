"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilePicker } from "@/components/profile-picker";
import { LoginTab } from "@/components/login-tab";
import {
  formatCode,
  isInviteCode,
  LIMITS,
  normalizeCode,
} from "@/lib/codes";
import { MEMBER_COLORS, MEMBER_EMOJIS, postJson } from "@/lib/client";

type Preview = {
  household: { name: string };
};

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(MEMBER_EMOJIS[0]);
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [legacyPreview, setLegacyPreview] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [issuedLoginCode, setIssuedLoginCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteReady = isInviteCode(inviteCode);

  useEffect(() => {
    const lookupLegacy =
      inviteCode.length === LIMITS.legacyInviteLength && legacyPreview;
    const lookupNew = inviteCode.length === LIMITS.inviteLength;
    if (!lookupLegacy && !lookupNew) return;

    let cancelled = false;
    fetch(`/api/household/preview?code=${inviteCode}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [inviteCode, legacyPreview]);

  async function submit(payload: Record<string, unknown>, url: string) {
    setBusy(true);
    setError(null);
    try {
      const data = await postJson<{ loginCode?: string }>(url, payload);
      if (data.loginCode) {
        setIssuedLoginCode(data.loginCode);
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const submitCreate = () =>
    submit(
      {
        householdName,
        name,
        emoji,
        color,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      "/api/household",
    );

  const submitJoin = () =>
    submit({ inviteCode, name, emoji, color }, "/api/household/join");

  async function copyLoginCode() {
    if (!issuedLoginCode) return;
    await navigator.clipboard.writeText(issuedLoginCode);
    setCopied(true);
  }

  if (issuedLoginCode) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Save your login code
          </h2>
          <p className="text-sm text-muted-foreground">
            You&apos;ll need this code, plus the household invite code and your
            name, to sign in on another device. It is shown only once.
          </p>
        </div>
        <p className="break-all rounded-2xl bg-muted/50 p-4 text-center font-mono text-sm tracking-widest">
          {formatCode(issuedLoginCode)}
        </p>
        <Button variant="outline" className="w-full" onClick={copyLoginCode}>
          {copied ? "Copied ✓" : "Copy login code"}
        </Button>
        <Button
          className="w-full"
          size="lg"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
        >
          I&apos;ve saved it
        </Button>
      </div>
    );
  }

  const profileFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex"
          maxLength={LIMITS.memberName}
          autoComplete="given-name"
        />
      </div>
      <ProfilePicker
        emoji={emoji}
        color={color}
        onEmojiChange={setEmoji}
        onColorChange={setColor}
      />
    </div>
  );

  return (
    <Tabs defaultValue="create" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="create">Create</TabsTrigger>
        <TabsTrigger value="join">Join</TabsTrigger>
        <TabsTrigger value="login">Log in</TabsTrigger>
      </TabsList>

      <TabsContent value="create" className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="householdName">Household name</Label>
          <Input
            id="householdName"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="Smith Family"
            maxLength={LIMITS.householdName}
          />
        </div>
        {profileFields}
        <Button
          className="w-full"
          size="lg"
          disabled={busy || !householdName.trim() || !name.trim()}
          onClick={submitCreate}
        >
          {busy ? "Creating…" : "Create household"}
        </Button>
      </TabsContent>

      <TabsContent value="join" className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inviteCode">Invite code</Label>
          <Input
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(
                normalizeCode(e.target.value).slice(0, LIMITS.inviteLength),
              );
              setPreview(null);
              setLegacyPreview(false);
            }}
            onBlur={() => {
              if (inviteCode.length === LIMITS.legacyInviteLength) {
                setLegacyPreview(true);
              }
            }}
            placeholder="Paste invite code"
            autoComplete="off"
            spellCheck={false}
            className="font-mono tracking-widest uppercase"
          />
        </div>

        {preview && (
          <div className="space-y-1 rounded-2xl bg-muted/50 p-3">
            <p className="text-sm font-medium">
              Joining {preview.household.name}
            </p>
            <p className="text-xs text-muted-foreground">
              This creates a new profile. To open an existing one, use the Log
              in tab with your login code.
            </p>
          </div>
        )}

        {profileFields}
        <Button
          className="w-full"
          size="lg"
          disabled={busy || !inviteReady || !name.trim()}
          onClick={submitJoin}
        >
          {busy ? "Joining…" : "Join as new member"}
        </Button>
      </TabsContent>

      <TabsContent value="login" className="mt-6">
        <LoginTab />
      </TabsContent>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </Tabs>
  );
}
