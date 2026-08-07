"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReservationEntry } from "@/hooks/use-reservations";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const GRID_CELLS = 42; // 6 weeks covers every month layout

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function gridStartFor(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(1 - start.getDay());
  return start;
}

export function MonthGrid({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (day: Date) => void;
}) {
  const [month, setMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );
  // dayKey -> unique member colors with reservations that day
  const [dots, setDots] = useState<Record<string, string[]>>({});
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;

  useEffect(() => {
    const [year, monthIndex] = monthKey.split("-").map(Number);
    const from = gridStartFor(new Date(year, monthIndex, 1));
    const to = new Date(from);
    to.setDate(to.getDate() + GRID_CELLS);
    fetch(
      `/api/reservations?from=${from.toISOString()}&to=${to.toISOString()}`,
      { cache: "no-store" },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { reservations: ReservationEntry[] } | null) => {
        if (!data) return;
        const map: Record<string, string[]> = {};
        for (const entry of data.reservations) {
          const key = dayKey(new Date(entry.reservation.startAt));
          const colors = (map[key] ??= []);
          if (!colors.includes(entry.member.color)) colors.push(entry.member.color);
        }
        setDots(map);
      })
      .catch(() => null);
  }, [monthKey]);

  const gridStart = gridStartFor(month);
  const today = new Date();

  return (
    <div className="rounded-3xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="font-display text-lg font-semibold">
          {month.toLocaleDateString([], { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Next month"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[10px] font-medium text-muted-foreground">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="py-1">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: GRID_CELLS }, (_, i) => {
          const day = new Date(gridStart);
          day.setDate(gridStart.getDate() + i);
          const inMonth = day.getMonth() === month.getMonth();
          const isSelected = day.toDateString() === selected.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          const colors = dots[dayKey(day)] ?? [];
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(day)}
              className={cn(
                "flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-sm transition-colors",
                !inMonth && "text-muted-foreground/40",
                isSelected
                  ? "bg-moss font-semibold text-moss-foreground shadow-md shadow-moss/20"
                  : "hover:bg-muted",
                isToday && !isSelected && "ring-1 ring-inset ring-gold/60",
              )}
            >
              <span className="leading-none">{day.getDate()}</span>
              <span className="flex h-1.5 gap-0.5">
                {colors.slice(0, 3).map((color, j) => (
                  <span
                    key={j}
                    className="size-1.5 rounded-full"
                    style={{
                      backgroundColor: isSelected ? "currentColor" : color,
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
