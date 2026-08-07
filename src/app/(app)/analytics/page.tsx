"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { bucketIndex, buildBuckets } from "@/components/analytics/buckets";
import {
  formatHour,
  formatMinutes,
  HourChart,
  Leaderboard,
  MemberLineChart,
  TrendChart,
  WeekdayChart,
} from "@/components/analytics/charts";
import { VineSprig } from "@/components/decor";
import { useStatusContext } from "@/components/status-provider";
import type { AnalyticsPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

type Scope = "me" | "house";

const RANGES = [
  { key: "14", label: "2 weeks", days: 14, title: "Last 2 weeks" },
  { key: "90", label: "3 months", days: 90, title: "Last 3 months" },
  { key: "all", label: "All time", days: null, title: "All time" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [scope, setScope] = useState<Scope>("house");
  const [rangeKey, setRangeKey] = useState<RangeKey>("14");
  const { data: status } = useStatusContext();
  const meId = status?.meId ?? "";
  const range = RANGES.find((r) => r.key === rangeKey)!;

  // Reset to the loading state during render when the range changes
  const [prevRange, setPrevRange] = useState<RangeKey>(rangeKey);
  if (prevRange !== rangeKey) {
    setPrevRange(rangeKey);
    setData(null);
  }

  useEffect(() => {
    fetch(`/api/analytics?days=${rangeKey}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => null);
  }, [rangeKey]);

  const inScope = (memberId: string) => scope === "house" || memberId === meId;

  let content: React.ReactNode;
  if (!data || !status) {
    content = (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  } else if (data.perMember.length === 0) {
    content = (
      <div className="animate-fade-up flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gold/40 bg-card/50 p-10 text-center">
        <VineSprig className="h-8 w-16 opacity-80" />
        <p className="font-display text-xl">No history yet</p>
        <p className="text-sm text-muted-foreground">
          No sessions in this period — charts appear once people check in.
        </p>
      </div>
    );
  } else {
    const scoped = data.perMember.filter((m) => inScope(m.memberId));
    const sessions = scoped.reduce((sum, m) => sum + m.sessions, 0);
    const totalMinutes = scoped.reduce((sum, m) => sum + m.totalMinutes, 0);
    const avgMinutes = sessions ? Math.round((totalMinutes / sessions) * 10) / 10 : 0;

    const hours = Array.from({ length: 24 }, () => 0);
    for (const row of data.byHour) {
      if (inScope(row.memberId)) hours[row.hour] += row.sessions;
    }
    const topHours = hours
      .map((count, hour) => ({ hour, count }))
      .filter((h) => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const weekdays = Array.from({ length: 7 }, () => 0);
    for (const row of data.byWeekday) {
      if (inScope(row.memberId)) weekdays[row.weekday] += row.sessions;
    }

    const earliestDay = data.byDay.reduce<string | null>(
      (min, r) => (min === null || r.day < min ? r.day : min),
      null,
    );
    const { buckets, stepDays } = buildBuckets(range.days, earliestDay);
    const perBucket = stepDays === 1 ? "day" : "week";

    const trend = buckets.map((b) => ({ label: b.label, minutes: 0, sessions: 0 }));
    for (const row of data.byDay) {
      if (!inScope(row.memberId)) continue;
      const i = bucketIndex(row.day, buckets, stepDays);
      if (i < 0) continue;
      trend[i].minutes += row.minutes;
      trend[i].sessions += row.sessions;
    }

    // One line per member (always household-wide — it's a comparison chart)
    const memberSeries = data.perMember.map((m) => {
      const values = buckets.map(() => 0);
      for (const row of data.byDay) {
        if (row.memberId !== m.memberId) continue;
        const i = bucketIndex(row.day, buckets, stepDays);
        if (i >= 0) values[i] += row.minutes;
      }
      return {
        memberId: m.memberId,
        label: m.memberId === meId ? "You" : m.name,
        emoji: m.emoji,
        color: m.color,
        values,
      };
    });

    content = (
      <>
        <div className="animate-fade-up grid grid-cols-3 gap-2 text-center">
          {[
            { value: String(sessions), label: "Sessions" },
            { value: `${avgMinutes}m`, label: "Avg length" },
            { value: formatMinutes(totalMinutes), label: "Total time" },
          ].map((tile) => (
            <Card key={tile.label} className="gap-0.5 rounded-3xl p-4">
              <p className="font-display text-2xl font-semibold">{tile.value}</p>
              <p className="text-xs text-muted-foreground">{tile.label}</p>
            </Card>
          ))}
        </div>

        <Card className="animate-fade-up gap-3 rounded-3xl p-5 [animation-delay:60ms]">
          <div>
            <h2 className="text-sm font-semibold">{range.title}</h2>
            <p className="text-xs text-muted-foreground">
              Minutes in the bathroom per {perBucket}
            </p>
          </div>
          <TrendChart days={trend} />
        </Card>

        <Card className="animate-fade-up gap-3 rounded-3xl p-5 [animation-delay:90ms]">
          <div>
            <h2 className="text-sm font-semibold">Who&apos;s using it most</h2>
            <p className="text-xs text-muted-foreground">
              Minutes per member per {perBucket}, {range.title.toLowerCase()}
            </p>
          </div>
          <MemberLineChart
            series={memberSeries}
            dayLabels={buckets.map((b) => b.label)}
          />
        </Card>

        <Card className="animate-fade-up gap-3 rounded-3xl p-5 [animation-delay:120ms]">
          <div>
            <h2 className="text-sm font-semibold">Busiest hours</h2>
            <p className="text-xs text-muted-foreground">
              {topHours.length > 0
                ? `Peak times: ${topHours.map((h) => formatHour(h.hour)).join(", ")}`
                : "No sessions in this view yet"}
            </p>
          </div>
          <HourChart sessionsByHour={hours} />
        </Card>

        <Card className="animate-fade-up gap-3 rounded-3xl p-5 [animation-delay:180ms]">
          <div>
            <h2 className="text-sm font-semibold">By day of week</h2>
            <p className="text-xs text-muted-foreground">Sessions per weekday</p>
          </div>
          <WeekdayChart sessionsByWeekday={weekdays} />
        </Card>

        <Card className="animate-fade-up gap-3 rounded-3xl p-5 [animation-delay:240ms]">
          <div>
            <h2 className="text-sm font-semibold">Household leaderboard</h2>
            <p className="text-xs text-muted-foreground">Total time, all members</p>
          </div>
          <Leaderboard perMember={data.perMember} meId={meId} />
        </Card>
      </>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <header className="animate-fade-up flex items-center justify-between px-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Analytics
        </h1>
        <div className="flex rounded-full border bg-card p-0.5">
          {(
            [
              { value: "house", label: "House" },
              { value: "me", label: "You" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScope(option.value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                scope === option.value
                  ? "bg-moss text-moss-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="animate-fade-up flex gap-2 px-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRangeKey(r.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              rangeKey === r.key
                ? "border-gold/60 bg-gold/15 text-gold-foreground dark:text-gold"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {content}
    </main>
  );
}
