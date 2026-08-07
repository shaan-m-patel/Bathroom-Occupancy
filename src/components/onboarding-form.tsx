"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilePicker } from "@/components/profile-picker";
import { LoginTab } from "@/components/login-tab";
import { MEMBER_COLORS, MEMBER_EMOJIS, postJson } from "@/lib/client";

type Preview = {
  household: { name: string };
  members: { id: string; name: string; emoji: string; color: string }[];
};

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(MEMBER_EMOJIS[0]);
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inviteCode.length !== 6) return;
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
  }, [inviteCode]);

  async function submit(payload: Record<string, unknown>, url: string) {
    setBusy(true);
    setError(null);
    try {
      await postJson(url, payload);
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

  const submitClaim = (claimMemberId: string) =>
    submit({ inviteCode, claimMemberId }, "/api/household/join");

  const profileFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex"
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
              setInviteCode(e.target.value.toUpperCase());
              setPreview(null);
            }}
            placeholder="ABC123"
            maxLength={6}
            className="font-mono tracking-widest uppercase"
          />
        </div>

        {preview && (
          <div className="space-y-2 rounded-2xl bg-muted/50 p-3">
            <p className="text-sm font-medium">
              Joining {preview.household.name}
            </p>
            {preview.members.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  Already a member? Tap your profile to sign back in.
                </p>
                <div className="flex flex-wrap gap-2">
                  {preview.members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={busy}
                      onClick={() => submitClaim(m.id)}
                      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
                      style={{ borderColor: `${m.color}66` }}
                    >
                      <span>{m.emoji}</span>
                      <span className="font-medium">{m.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Or create a new profile below.
                </p>
              </>
            )}
          </div>
        )}

        {profileFields}
        <Button
          className="w-full"
          size="lg"
          disabled={busy || inviteCode.length !== 6 || !name.trim()}
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
