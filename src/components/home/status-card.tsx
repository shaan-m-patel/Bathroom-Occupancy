"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckInSheet } from "@/components/home/check-in-sheet";
import { Countdown } from "@/components/home/countdown";
import { useStatusContext } from "@/components/status-provider";
import { postJson } from "@/lib/client";
import { formatTime } from "@/lib/time";

export function StatusCard() {
  const { data, refresh } = useStatusContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return <Skeleton className="h-64 w-full rounded-3xl" />;
  }

  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const occupancy = data.occupancy;

  if (!occupancy) {
    return (
      <Card className="space-y-6 rounded-3xl border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="space-y-1 pt-2">
          <div className="text-5xl">🟢</div>
          <p className="text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
            Available
          </p>
          <p className="text-sm text-muted-foreground">
            The bathroom is free right now
          </p>
        </div>
        <CheckInSheet onCheckedIn={refresh} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </Card>
    );
  }

  const isMine = occupancy.member.id === data.meId;

  return (
    <Card className="space-y-5 rounded-3xl border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
      <div className="space-y-1 text-center">
        <div className="text-5xl">🔴</div>
        <p className="text-3xl font-bold tracking-tight text-red-700 dark:text-red-400">
          Occupied
        </p>
        <p className="text-sm text-muted-foreground">
          {occupancy.member.emoji} {isMine ? "You" : occupancy.member.name}
          {occupancy.session.note ? ` · ${occupancy.session.note}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">Checked in</p>
          <p className="text-sm font-semibold">
            {formatTime(occupancy.session.startedAt)}
          </p>
        </div>
        <div className="rounded-2xl bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">Est. finish</p>
          <p className="text-sm font-semibold">
            {formatTime(occupancy.session.expectedEndAt)}
          </p>
        </div>
        <div className="rounded-2xl bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <Countdown
            until={occupancy.session.expectedEndAt}
            className="text-sm font-semibold tabular-nums"
          />
        </div>
      </div>

      {isMine && (
        <div className="space-y-3">
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-700"
            disabled={busy}
            onClick={() => act(() => postJson("/api/checkout"))}
          >
            ✓ Finished
          </Button>
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">
              Need more time?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((m) => (
                <Button
                  key={m}
                  variant="outline"
                  className="rounded-xl bg-background/70"
                  disabled={busy}
                  onClick={() => act(() => postJson("/api/extend", { minutes: m }))}
                >
                  +{m} min
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </Card>
  );
}
