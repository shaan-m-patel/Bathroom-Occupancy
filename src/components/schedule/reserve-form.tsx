"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const DURATIONS = [15, 30, 45, 60];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ReserveForm() {
  const router = useRouter();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [date, setDate] = useState(toDateInputValue(tomorrow));
  const [time, setTime] = useState("07:30");
  const [duration, setDuration] = useState(30);
  const [reason, setReason] = useState("");
  const [recurrence, setRecurrence] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{
    startAt: string;
    endAt: string;
  } | null>(null);

  function buildTimes() {
    const startAt = new Date(`${date}T${time}`);
    const endAt = new Date(startAt.getTime() + duration * 60 * 1000);
    return { startAt, endAt };
  }

  async function submit(times?: { startAt: Date; endAt: Date }) {
    const { startAt, endAt } = times ?? buildTimes();
    setBusy(true);
    setError(null);
    setSuggestion(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          reason: reason || null,
          recurrenceDays: recurrence || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reserve");
        if (data.suggestion) setSuggestion(data.suggestion);
        setBusy(false);
        return;
      }
      router.push("/schedule");
    } catch {
      setError("Could not reserve");
      setBusy(false);
    }
  }

  return (
    <Card className="gap-5 rounded-3xl p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            min={toDateInputValue(new Date())}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Start time</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Duration</Label>
        <div className="grid grid-cols-4 gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                "rounded-xl border py-2 text-sm font-medium transition-colors",
                duration === d
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-muted",
              )}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (optional)</Label>
        <Input
          id="reason"
          placeholder="Morning routine"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Repeat weekly</Label>
        <div className="flex gap-1.5">
          {WEEKDAYS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRecurrence((r) => r ^ (1 << i))}
              className={cn(
                "size-9 rounded-full border text-sm font-medium transition-colors",
                recurrence & (1 << i)
                  ? "border-moss bg-moss text-moss-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {recurrence > 0 && (
          <p className="text-xs text-muted-foreground">
            Repeats on selected days for the next 2 weeks, rolling forward
            automatically.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {suggestion && (
        <button
          type="button"
          className="w-full rounded-2xl border border-gold/40 bg-gold/10 p-3 text-left text-sm transition-colors hover:bg-gold/15"
          onClick={() =>
            submit({
              startAt: new Date(suggestion.startAt),
              endAt: new Date(suggestion.endAt),
            })
          }
        >
          <span className="font-medium text-gold-foreground dark:text-gold">
            Nearest open slot:
          </span>{" "}
          {formatDay(suggestion.startAt)} {formatTime(suggestion.startAt)} –{" "}
          {formatTime(suggestion.endAt)} — tap to book
        </button>
      )}

      <Button
        size="lg"
        className="h-12 w-full rounded-2xl text-base font-semibold"
        disabled={busy || !date || !time}
        onClick={() => submit()}
      >
        {busy ? "Reserving…" : "Reserve"}
      </Button>
    </Card>
  );
}
