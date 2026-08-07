"use client";

import { cn } from "@/lib/utils";

export function DayStrip({
  selected,
  onSelect,
  days = 14,
}: {
  selected: Date;
  onSelect: (day: Date) => void;
  days?: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {Array.from({ length: days }, (_, i) => {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        const isSelected = day.toDateString() === selected.toDateString();
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => onSelect(day)}
            className={cn(
              "flex min-w-14 flex-col items-center rounded-2xl border px-3 py-2 transition-colors",
              isSelected
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="text-[11px] font-medium uppercase">
              {day.toLocaleDateString([], { weekday: "short" })}
            </span>
            <span className="text-lg font-semibold">{day.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}
