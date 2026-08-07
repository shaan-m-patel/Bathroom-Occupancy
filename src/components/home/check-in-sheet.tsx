"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { postJson } from "@/lib/client";
import { cn } from "@/lib/utils";

const DURATIONS = [5, 10, 15, 20, 30, 45, 60];
const NOTES = ["Quick shower", "Hair", "Getting ready", "Emergency"];

export function CheckInSheet({ onCheckedIn }: { onCheckedIn: () => void }) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<number | null>(15);
  const [customDuration, setCustomDuration] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveDuration = duration ?? Number(customDuration);

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/checkin", {
        durationMinutes: effectiveDuration,
        note,
      });
      setOpen(false);
      onCheckedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            size="lg"
            className="h-14 w-full rounded-2xl bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-700"
          />
        }
      >
        Check In
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <SheetHeader className="px-0">
          <SheetTitle>How long will you need?</SheetTitle>
          <SheetDescription>
            Everyone will see your estimated finish time.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4">
          <div className="grid grid-cols-4 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDuration(d);
                  setCustomDuration("");
                }}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-medium transition-colors",
                  duration === d
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "hover:bg-muted",
                )}
              >
                {d} min
              </button>
            ))}
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              placeholder="Custom"
              value={customDuration}
              onChange={(e) => {
                setCustomDuration(e.target.value);
                setDuration(null);
              }}
              className={cn(
                "h-auto rounded-xl text-center text-sm",
                duration === null && customDuration && "border-emerald-600",
              )}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {NOTES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNote(note === n ? null : n)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  note === n
                    ? "border-foreground bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            size="lg"
            className="h-13 w-full rounded-2xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
            disabled={
              busy ||
              !Number.isFinite(effectiveDuration) ||
              effectiveDuration < 1 ||
              effectiveDuration > 180
            }
            onClick={checkIn}
          >
            {busy ? "Checking in…" : "Confirm check in"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
