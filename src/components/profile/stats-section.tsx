"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MemberStat = {
  memberId: string;
  name: string;
  emoji: string;
  color: string;
  sessions: number;
  avgMinutes: number;
  totalMinutes: number;
};

type HourStat = { hour: number; sessions: number };

function formatHour(hour: number) {
  const suffix = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${suffix}`;
}

export function StatsSection({ meId }: { meId: string }) {
  const [data, setData] = useState<{
    perMember: MemberStat[];
    byHour: HourStat[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/analytics", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => null);
  }, []);

  if (!data) return <Skeleton className="h-48 w-full rounded-3xl" />;

  const mine = data.perMember.find((m) => m.memberId === meId);
  const maxHourSessions = Math.max(...data.byHour.map((h) => h.sessions), 1);
  const topHours = [...data.byHour]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 3);

  return (
    <Card className="gap-4 rounded-3xl p-5">
      <h2 className="text-sm font-semibold">Usage stats</h2>

      {data.perMember.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No completed sessions yet — stats appear once people start checking
          in.
        </p>
      ) : (
        <>
          {mine && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-muted/50 p-3">
                <p className="text-lg font-bold">{mine.sessions}</p>
                <p className="text-xs text-muted-foreground">Your sessions</p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-3">
                <p className="text-lg font-bold">{mine.avgMinutes}m</p>
                <p className="text-xs text-muted-foreground">Avg length</p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-3">
                <p className="text-lg font-bold">{mine.totalMinutes}m</p>
                <p className="text-xs text-muted-foreground">Total time</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Household leaderboard
            </p>
            {[...data.perMember]
              .sort((a, b) => b.totalMinutes - a.totalMinutes)
              .map((m) => (
                <div key={m.memberId} className="flex items-center gap-2">
                  <span className="w-6 text-center">{m.emoji}</span>
                  <span className="w-20 truncate text-sm">
                    {m.memberId === meId ? "You" : m.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(m.totalMinutes / Math.max(...data.perMember.map((x) => x.totalMinutes), 1)) * 100}%`,
                        backgroundColor: m.color,
                      }}
                    />
                  </div>
                  <span className="w-14 text-right text-xs text-muted-foreground">
                    {m.avgMinutes}m avg
                  </span>
                </div>
              ))}
          </div>

          {data.byHour.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Busiest times:{" "}
                {topHours.map((h) => formatHour(h.hour)).join(", ")}
              </p>
              <div className="flex h-16 items-end gap-px">
                {Array.from({ length: 24 }, (_, hour) => {
                  const stat = data.byHour.find((h) => h.hour === hour);
                  const pct = stat ? (stat.sessions / maxHourSessions) * 100 : 0;
                  return (
                    <div
                      key={hour}
                      className="flex-1 rounded-t bg-primary/70"
                      style={{ height: `${Math.max(pct, 3)}%` }}
                      title={`${formatHour(hour)}: ${stat?.sessions ?? 0} sessions`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>11pm</span>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
