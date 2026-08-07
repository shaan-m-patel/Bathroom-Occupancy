"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryKey,
} from "@/lib/notification-prefs";

type Props = {
  initialPrefs: Record<string, boolean>;
  initialQuietStart: number | null;
  initialQuietEnd: number | null;
};

const DEFAULT_QUIET = { start: 22 * 60, end: 7 * 60 };

function toTimeString(minutes: number) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function NotificationSettings({
  initialPrefs,
  initialQuietStart,
  initialQuietEnd,
}: Props) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [quiet, setQuiet] = useState(
    initialQuietStart !== null && initialQuietEnd !== null
      ? { start: initialQuietStart, end: initialQuietEnd }
      : null,
  );
  const [error, setError] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setError(false);
    const res = await fetch("/api/member", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) setError(true);
  }

  function togglePref(key: NotificationCategoryKey, enabled: boolean) {
    const next = { ...prefs, [key]: enabled };
    setPrefs(next);
    void patch({ notificationPrefs: next });
  }

  function saveQuiet(next: { start: number; end: number } | null) {
    setQuiet(next);
    void patch({
      quietHoursStart: next?.start ?? null,
      quietHoursEnd: next?.end ?? null,
    });
  }

  return (
    <Card className="gap-4 rounded-3xl p-5">
      <div>
        <p className="text-sm font-semibold">Notification preferences</p>
        <p className="text-xs text-muted-foreground">
          Choose which alerts get pushed to your phone. The in-app feed always
          shows everything.
        </p>
      </div>

      <div className="space-y-3">
        {NOTIFICATION_CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">{cat.label}</p>
              <p className="text-xs text-muted-foreground">{cat.description}</p>
            </div>
            <Switch
              checked={prefs[cat.key] !== false}
              onCheckedChange={(v) => togglePref(cat.key, v)}
            />
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm">Quiet hours</p>
            <p className="text-xs text-muted-foreground">
              No pushes during this window — except &ldquo;notify me when
              free&rdquo; pings you asked for
            </p>
          </div>
          <Switch
            checked={quiet !== null}
            onCheckedChange={(v) => saveQuiet(v ? DEFAULT_QUIET : null)}
          />
        </div>

        {quiet && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="quiet-start" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="quiet-start"
                type="time"
                value={toTimeString(quiet.start)}
                onChange={(e) =>
                  e.target.value &&
                  saveQuiet({ ...quiet, start: toMinutes(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quiet-end" className="text-xs text-muted-foreground">
                Until
              </Label>
              <Input
                id="quiet-end"
                type="time"
                value={toTimeString(quiet.end)}
                onChange={(e) =>
                  e.target.value &&
                  saveQuiet({ ...quiet, end: toMinutes(e.target.value) })
                }
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">
          Couldn&apos;t save — check your connection and try again.
        </p>
      )}
    </Card>
  );
}
