"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStatusContext } from "@/components/status-provider";
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

const COLLAPSED_COUNT = 5;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsFeed() {
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [expanded, setExpanded] = useState(false);
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
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold">Notifications</h2>

      {!items ? (
        <Skeleton className="h-16 w-full rounded-3xl" />
      ) : items.length === 0 ? (
        <Card className="rounded-3xl p-4">
          <p className="text-sm text-muted-foreground">
            All quiet in the courtyard. You&apos;ll hear about check-ins,
            reservations, and challenges here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {(expanded ? items : items.slice(0, COLLAPSED_COUNT)).map((n) => {
            const inner = (
              <Card
                className={cn(
                  "flex-row items-center gap-3 rounded-3xl p-4",
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
          {items.length > COLLAPSED_COUNT && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full py-1 text-center text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {expanded
                ? "Show fewer"
                : `Show ${items.length - COLLAPSED_COUNT} older`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
