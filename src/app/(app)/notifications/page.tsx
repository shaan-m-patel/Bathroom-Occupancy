"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStatusContext } from "@/components/status-provider";
import { VineSprig } from "@/components/decor";
import type { NotificationDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, string> = {
  checked_in: "🔴",
  bathroom_available: "🟢",
  time_extended: "⏱️",
  session_expired: "⌛",
  reservation_reminder: "📅",
  challenge_received: "🟠",
  challenge_accepted: "✅",
  challenge_declined: "❌",
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const { refresh } = useStatusContext();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      setItems(data.notifications);
      // Mark everything read, then let the badge update on the next poll
      await fetch("/api/notifications", { method: "POST" });
      refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <header className="animate-fade-up px-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Notifications
        </h1>
      </header>

      {!items ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-3xl" />
          <Skeleton className="h-16 w-full rounded-3xl" />
          <Skeleton className="h-16 w-full rounded-3xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="animate-fade-up flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gold/40 bg-card/50 p-10 text-center">
          <VineSprig className="h-8 w-16 opacity-80" />
          <p className="font-display text-xl">All quiet in the courtyard</p>
          <p className="text-sm text-muted-foreground">
            You&apos;ll hear about check-ins, reservations, and challenges
            here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const inner = (
              <Card
                className={cn(
                  "animate-fade-up flex-row items-center gap-3 rounded-3xl p-4",
                  !n.readAt && "border-gold/40 bg-gold/5",
                )}
              >
                <span className="text-xl">{TYPE_ICONS[n.type] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{n.body}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {relativeTime(n.createdAt)}
                  </p>
                </div>
              </Card>
            );
            return n.href ? (
              <Link key={n.id} href={n.href} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </main>
  );
}
