"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

function dayKeysBack(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (count - 1 - i));
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      label: d.toLocaleDateString([], { month: "short", day: "numeric" }),
    };
  });
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [scope, setScope] = useState<Scope>("house");
  const { data: status } = useStatusContext();
  const meId = status?.meId ?? "";

  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => null);
  }, []);

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
          Charts appear once people start checking in.
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

    const days = dayKeysBack(14);
    const trend = days.map(({ key, label }) => {
      const rows = data.byDay.filter((r) => r.day === key && inScope(r.memberId));
      return {
        label,
        minutes: rows.reduce((sum, r) => sum + r.minutes, 0),
        sessions: rows.reduce((sum, r) => sum + r.sessions, 0),
      };
    });

    // One line per member (always household-wide — it's a comparison chart)
    const memberSeries = data.perMember.map((m) => ({
      memberId: m.memberId,
      label: m.memberId === meId ? "You" : m.name,
      emoji: m.emoji,
      color: m.color,
      values: days.map(({ key }) =>
        data.byDay
          .filter((r) => r.day === key && r.memberId === m.memberId)
          .reduce((sum, r) => sum + r.minutes, 0),
      ),
    }));

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
            <h2 className="text-sm font-semibold">Last 14 days</h2>
            <p className="text-xs text-muted-foreground">
              Minutes in the bathroom per day
            </p>
          </div>
          <TrendChart days={trend} />
        </Card>

        <Card className="animate-fade-up gap-3 rounded-3xl p-5 [animation-delay:90ms]">
          <div>
            <h2 className="text-sm font-semibold">Who&apos;s using it most</h2>
            <p className="text-xs text-muted-foreground">
              Daily minutes per member, last 14 days
            </p>
          </div>
          <MemberLineChart
            series={memberSeries}
            dayLabels={days.map((d) => d.label)}
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

      {content}
    </main>
  );
}
