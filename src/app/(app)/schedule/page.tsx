"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DayStrip } from "@/components/schedule/day-strip";
import { ReservationCard } from "@/components/schedule/reservation-card";
import { useReservations } from "@/hooks/use-reservations";
import { useStatusContext } from "@/components/status-provider";
import { formatDay } from "@/lib/time";

export default function SchedulePage() {
  const [day, setDay] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const { entries, error, refresh } = useReservations(day);
  const { data } = useStatusContext();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <header className="flex items-center justify-between px-1">
        <h1 className="text-xl font-semibold tracking-tight">Schedule</h1>
        <Button
          size="sm"
          className="rounded-xl"
          render={<Link href="/reserve" />}
        >
          Reserve
        </Button>
      </header>

      <DayStrip selected={day} onSelect={setDay} />

      <h2 className="px-1 text-sm font-medium text-muted-foreground">
        {formatDay(day)}
      </h2>

      {error && <p className="px-1 text-sm text-destructive">{error}</p>}

      {!entries ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed p-10 text-center">
          <span className="text-3xl">📅</span>
          <p className="text-sm text-muted-foreground">
            Nothing reserved — the whole day is open.
          </p>
          <Button
            variant="outline"
            className="rounded-xl"
            render={<Link href="/reserve" />}
          >
            Reserve a slot
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <ReservationCard
              key={entry.reservation.id}
              entry={entry}
              meId={data?.meId ?? ""}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </main>
  );
}
