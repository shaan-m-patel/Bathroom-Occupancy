"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilePicker } from "@/components/profile-picker";
import { MEMBER_COLORS, MEMBER_EMOJIS, postJson } from "@/lib/client";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(MEMBER_EMOJIS[0]);
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(mode: "create" | "join") {
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") {
        await postJson("/api/household", {
          householdName,
          name,
          emoji,
          color,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } else {
        await postJson("/api/household/join", { inviteCode, name, emoji, color });
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
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
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="create">Create household</TabsTrigger>
        <TabsTrigger value="join">Join household</TabsTrigger>
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
          onClick={() => submit("create")}
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
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="font-mono tracking-widest uppercase"
          />
        </div>
        {profileFields}
        <Button
          className="w-full"
          size="lg"
          disabled={busy || inviteCode.length !== 6 || !name.trim()}
          onClick={() => submit("join")}
        >
          {busy ? "Joining…" : "Join household"}
        </Button>
      </TabsContent>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </Tabs>
  );
}
