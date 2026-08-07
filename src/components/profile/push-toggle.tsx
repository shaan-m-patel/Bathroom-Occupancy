"use client";

import { useEffect, useState } from "react";
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
    <Card className="flex-row items-center justify-between gap-3 rounded-3xl p-5">
      <div>
        <p className="text-sm font-semibold">Push notifications</p>
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
    </Card>
  );
}
