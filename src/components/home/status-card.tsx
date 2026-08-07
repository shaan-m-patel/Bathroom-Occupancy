"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckInSheet } from "@/components/home/check-in-sheet";
import { Countdown } from "@/components/home/countdown";
import { VineSprig } from "@/components/decor";
import { useStatusContext } from "@/components/status-provider";
import { postJson } from "@/lib/client";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

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
      <Card className="relative overflow-hidden rounded-3xl border-moss/25 bg-gradient-to-b from-moss/10 to-card p-6 text-center shadow-lg shadow-moss/5">
        <VineSprig className="absolute -left-1 top-3 h-10 w-20 opacity-70" />
        <VineSprig className="absolute -right-1 top-3 h-10 w-20 -scale-x-100 opacity-70" />
        <div className="space-y-2 pt-3">
          <span className="animate-glow mx-auto block size-4 rounded-full bg-moss shadow-[0_0_18px] shadow-moss/60" />
          <p className="font-display text-4xl font-semibold tracking-tight text-moss">
            Available
          </p>
          <p className="text-sm text-muted-foreground">
            The bath awaits — the courtyard is yours
          </p>
        </div>
        <div className="mt-5">
          <CheckInSheet onCheckedIn={refresh} />
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </Card>
    );
  }

  const isMine = occupancy.member.id === data.meId;

  return (
    <Card className="relative overflow-hidden rounded-3xl border-terracotta/25 bg-gradient-to-b from-terracotta/10 to-card p-6 shadow-lg shadow-terracotta/5">
      <div className="space-y-2 text-center">
        <span className="animate-glow mx-auto block size-4 rounded-full bg-terracotta shadow-[0_0_18px] shadow-terracotta/60" />
        <p className="font-display text-4xl font-semibold tracking-tight text-terracotta">
          Occupied
        </p>
        <p className="text-sm text-muted-foreground">
          {occupancy.member.emoji} {isMine ? "You" : occupancy.member.name}
          {occupancy.session.note ? ` · ${occupancy.session.note}` : ""}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Checked in</p>
          <p className="text-sm font-semibold">
            {formatTime(occupancy.session.startedAt)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Est. finish</p>
          <p className="text-sm font-semibold">
            {formatTime(occupancy.session.expectedEndAt)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <Countdown
            until={occupancy.session.expectedEndAt}
            className="text-sm font-semibold tabular-nums"
          />
        </div>
      </div>

      {!isMine && (
        <div className="mt-5">
          <Button
            variant="outline"
            className={cn(
              "h-12 w-full rounded-2xl bg-background/60",
              data.amWaiting && "border-gold/50 bg-gold/10 hover:bg-gold/15",
            )}
            disabled={busy}
            onClick={() =>
              act(() => postJson("/api/waitlist", { waiting: !data.amWaiting }))
            }
          >
            {data.amWaiting
              ? "🔔 You'll be pinged when it's free — tap to cancel"
              : "🔔 Notify me when it's free"}
          </Button>
        </div>
      )}

      {isMine && (
        <div className="mt-5 space-y-3">
          {data.waitingCount > 0 && (
            <p className="text-center text-xs font-medium text-terracotta">
              👀 {data.waitingCount === 1
                ? "Someone is waiting"
                : `${data.waitingCount} people are waiting`}
            </p>
          )}
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl bg-moss text-lg font-semibold text-moss-foreground shadow-md shadow-moss/20 transition-transform hover:bg-moss/90 active:scale-[0.99]"
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
                  className="rounded-xl bg-background/60"
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

      {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
    </Card>
  );
}
