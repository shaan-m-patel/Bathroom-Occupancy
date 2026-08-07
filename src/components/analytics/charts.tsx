"use client";

import type { MemberStat } from "@/lib/types";

export function formatHour(hour: number) {
  const suffix = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${suffix}`;
}

export function formatMinutes(total: number) {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** 24 bars, one per hour of the day. */
export function HourChart({ sessionsByHour }: { sessionsByHour: number[] }) {
  const max = Math.max(...sessionsByHour, 1);
  return (
    <div>
      <div className="flex h-20 items-end gap-px">
        {sessionsByHour.map((count, hour) => (
          <div
            key={hour}
            className="flex-1 rounded-t bg-moss/70"
            style={{ height: `${Math.max((count / max) * 100, 3)}%` }}
            title={`${formatHour(hour)}: ${count} sessions`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </div>
  );
}

/** 7 bars, Sunday through Saturday. */
export function WeekdayChart({
  sessionsByWeekday,
}: {
  sessionsByWeekday: number[];
}) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const max = Math.max(...sessionsByWeekday, 1);
  return (
    <div className="flex items-end gap-2">
      {sessionsByWeekday.map((count, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {count || ""}
          </span>
          <div className="flex h-16 w-full items-end">
            <div
              className="w-full rounded-t-lg bg-gold/70"
              style={{ height: `${Math.max((count / max) * 100, 4)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** Daily minutes over the last two weeks. */
export function TrendChart({
  days,
}: {
  days: { label: string; minutes: number; sessions: number }[];
}) {
  const max = Math.max(...days.map((d) => d.minutes), 1);
  return (
    <div>
      <div className="flex h-24 items-end gap-1">
        {days.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-terracotta/60"
            style={{ height: `${Math.max((d.minutes / max) * 100, 3)}%` }}
            title={`${d.label}: ${formatMinutes(d.minutes)} across ${d.sessions} sessions`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{days[0]?.label}</span>
        <span>{days[Math.floor(days.length / 2)]?.label}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** One line per member: daily minutes over the window, in their profile color. */
export function MemberLineChart({
  series,
  dayLabels,
}: {
  series: {
    memberId: string;
    label: string;
    emoji: string;
    color: string;
    values: number[];
  }[];
  dayLabels: string[];
}) {
  const width = 300;
  const height = 110;
  const pad = 6;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const x = (i: number) =>
    pad + (i / Math.max(dayLabels.length - 1, 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Daily bathroom minutes per member"
      >
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={pad}
            x2={width - pad}
            y1={y(max * f)}
            y2={y(max * f)}
            className="stroke-border"
            strokeWidth="0.5"
            strokeDasharray="3 3"
          />
        ))}
        {series.map((s) => (
          <g key={s.memberId}>
            <polyline
              points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.values.map((v, i) =>
              v > 0 ? (
                <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={s.color} />
              ) : null,
            )}
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{dayLabels[0]}</span>
        <span>{dayLabels[Math.floor(dayLabels.length / 2)]}</span>
        <span>Today</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.memberId} className="flex items-center gap-1.5 text-xs">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.emoji} {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Household leaderboard by total time, with per-member colored bars. */
export function Leaderboard({
  perMember,
  meId,
}: {
  perMember: MemberStat[];
  meId: string;
}) {
  const sorted = [...perMember].sort((a, b) => b.totalMinutes - a.totalMinutes);
  const max = Math.max(...sorted.map((m) => m.totalMinutes), 1);
  return (
    <div className="space-y-2.5">
      {sorted.map((m, i) => (
        <div key={m.memberId} className="flex items-center gap-2">
          <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
          <span className="w-6 text-center">{m.emoji}</span>
          <span className="w-18 truncate text-sm">
            {m.memberId === meId ? "You" : m.name}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(m.totalMinutes / max) * 100}%`,
                backgroundColor: m.color,
              }}
            />
          </div>
          <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
            {formatMinutes(m.totalMinutes)}
          </span>
        </div>
      ))}
    </div>
  );
}
