"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client";
import { cn } from "@/lib/utils";

const REASONS = ["Work meeting", "Medical appointment", "Emergency", "Other"];

export function ChallengeDialog({
  reservationId,
  alreadyChallenged,
  onChallenged,
}: {
  reservationId: string;
  alreadyChallenged: boolean;
  onChallenged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveReason = reason === "Other" ? otherReason.trim() : reason;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/challenges", {
        reservationId,
        reason: effectiveReason,
      });
      setOpen(false);
      onChallenged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Challenge failed");
    } finally {
      setBusy(false);
    }
  }

  if (alreadyChallenged) {
    return (
      <Button size="sm" variant="outline" className="rounded-xl" disabled>
        Challenge sent
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-900 dark:hover:bg-orange-950"
          />
        }
      >
        Challenge
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>Challenge this reservation</DialogTitle>
          <DialogDescription>
            The owner will be asked to accept or decline. If accepted, the slot
            transfers to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  reason === r
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          {reason === "Other" && (
            <Input
              placeholder="Tell them why"
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
            />
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full rounded-xl bg-orange-500 text-white hover:bg-orange-600"
            disabled={busy || !effectiveReason}
            onClick={submit}
          >
            {busy ? "Sending…" : "Send challenge"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
