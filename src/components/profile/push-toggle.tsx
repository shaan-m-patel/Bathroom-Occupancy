"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  disablePush,
  enablePush,
  getPushSubscription,
  pushSupported,
} from "@/lib/push-client";

export function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    getPushSubscription()
      .then((sub) => {
        setSupported(pushSupported());
        setEnabled(!!sub);
      })
      .catch(() => setSupported(false));
  }, []);

  async function toggle(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        setEnabled(await enablePush());
      } else {
        await disablePush();
        setEnabled(false);
      }
    } catch {
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-3 rounded-3xl p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold">Push notifications</p>
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              aria-label="How to add the app to your home screen"
              aria-expanded={showInfo}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Info className="size-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {supported
              ? "Check-ins, challenges, and reminders on this device"
              : "Not supported in this browser — on iPhone, add the app to your Home Screen first"}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={toggle}
          disabled={!supported || busy}
        />
      </div>

      {showInfo && (
        <div className="animate-fade-up rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">
            Add this app to your home screen
          </p>
          <p>
            Press the three dots in your mobile browser&apos;s navigation bar,
            then swipe up or press the share button, press &ldquo;View
            more&rdquo;, then &ldquo;Add to Home Screen&rdquo;.
          </p>
        </div>
      )}
    </Card>
  );
}
