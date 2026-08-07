"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChallengeDialog } from "@/components/schedule/challenge-dialog";
import type { ReservationEntry } from "@/hooks/use-reservations";
import { postJson } from "@/lib/client";
import { formatTime } from "@/lib/time";

export function ReservationCard({
  entry,
  meId,
  onChanged,
}: {
  entry: ReservationEntry;
  meId: string;
  onChanged: () => void;
}) {
  const { reservation, member, challenges } = entry;
  const [busy, setBusy] = useState(false);
  const isMine = member.id === meId;
  const pending = challenges.find((c) => c.status === "pending");
  const queued = challenges.filter((c) => c.status === "queued");
  const resolved = challenges.filter(
    (c) => c.status === "accepted" || c.status === "declined",
  );
  const isPast = new Date(reservation.endAt) <= new Date();

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function cancel(series: boolean) {
    setBusy(true);
    try {
      await fetch(
        `/api/reservations/${reservation.id}${series ? "?series=true" : ""}`,
        { method: "DELETE" },
      );
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className="animate-fade-up gap-3 rounded-3xl border-l-4 p-4 shadow-sm"
      style={{
        borderLeftColor: pending ? "var(--gold)" : member.color,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: `${member.color}33` }}
          >
            {member.emoji}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {isMine ? "You" : member.name}
              {reservation.reason ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {reservation.reason}
                </span>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatTime(reservation.startAt)} – {formatTime(reservation.endAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {reservation.seriesId && (
            <Badge variant="secondary" className="rounded-full">
              Recurring
            </Badge>
          )}
          {pending && (
            <Badge className="rounded-full bg-gold text-gold-foreground">
              Challenged
            </Badge>
          )}
        </div>
      </div>

      {resolved.length + queued.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {challenges.length} challenge{challenges.length === 1 ? "" : "s"}
          {resolved.length > 0 &&
            ` · ${resolved.filter((c) => c.status === "accepted").length} accepted, ${resolved.filter((c) => c.status === "declined").length} declined`}
          {queued.length > 0 && ` · ${queued.length} waiting`}
        </p>
      )}

      {!isPast && (
        <div className="flex gap-2">
          {isMine ? (
            <>
              {pending && (
                <>
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl bg-moss text-moss-foreground hover:bg-moss/90"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        postJson(`/api/challenges/${pending.id}/respond`, {
                          action: "accept",
                        }),
                      )
                    }
                  >
                    Accept challenge
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        postJson(`/api/challenges/${pending.id}/respond`, {
                          action: "decline",
                        }),
                      )
                    }
                  >
                    Decline
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl text-muted-foreground"
                disabled={busy}
                onClick={() => cancel(false)}
              >
                Cancel
              </Button>
              {reservation.seriesId && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-muted-foreground"
                  disabled={busy}
                  onClick={() => cancel(true)}
                >
                  Cancel series
                </Button>
              )}
            </>
          ) : (
            <ChallengeDialog
              reservationId={reservation.id}
              alreadyChallenged={challenges.some(
                (c) =>
                  c.challengerMemberId === meId &&
                  (c.status === "pending" || c.status === "queued"),
              )}
              onChallenged={onChanged}
            />
          )}
        </div>
      )}
    </Card>
  );
}
