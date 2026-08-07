"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfilePicker } from "@/components/profile-picker";
import { postJson } from "@/lib/client";

type Props = {
  initialName: string;
  initialEmoji: string;
  initialColor: string;
};

export function ProfileEditor({ initialName, initialEmoji, initialColor }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);
  const [color, setColor] = useState(initialColor);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    name !== initialName || emoji !== initialEmoji || color !== initialColor;

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/member", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji, color }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await postJson("/api/logout");
    router.push("/welcome");
    router.refresh();
  }

  return (
    <Card className="gap-4 rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <span
          className="flex size-12 items-center justify-center rounded-full text-2xl"
          style={{ backgroundColor: `${color}33` }}
        >
          {emoji}
        </span>
        <div className="flex-1 space-y-1">
          <Label htmlFor="profile-name" className="text-xs text-muted-foreground">
            Your name
          </Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      <ProfilePicker
        emoji={emoji}
        color={color}
        onEmojiChange={setEmoji}
        onColorChange={setColor}
      />

      <div className="flex gap-2">
        <Button
          className="flex-1 rounded-xl"
          disabled={!dirty || busy || !name.trim()}
          onClick={save}
        >
          {saved ? "Saved ✓" : busy ? "Saving…" : "Save changes"}
        </Button>
        <Button
          variant="ghost"
          className="rounded-xl text-muted-foreground"
          onClick={logout}
        >
          Log out
        </Button>
      </div>
    </Card>
  );
}
