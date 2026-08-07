"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useStatusContext } from "@/components/status-provider";
import { formatTime } from "@/lib/time";

export function TodayReservations() {
  const { data } = useStatusContext();
  if (!data) return null;

  return (
    <Card className="rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Today&apos;s reservations</h2>
        <Link
          href="/schedule"
          className="text-xs font-medium text-gold-foreground underline-offset-4 hover:underline dark:text-gold"
        >
          View schedule
        </Link>
      </div>

      {data.reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reservations today. The bathroom is first come, first served.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.reservations.map(({ reservation, member }) => (
            <li
              key={reservation.id}
              className="flex items-center gap-3 rounded-2xl bg-muted/50 px-3 py-2.5"
            >
              <span
                className="flex size-8 items-center justify-center rounded-full text-base"
                style={{ backgroundColor: `${member.color}33` }}
              >
                {member.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.id === data.meId ? "You" : member.name}
                  {reservation.reason ? ` · ${reservation.reason}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTime(reservation.startAt)} – {formatTime(reservation.endAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
