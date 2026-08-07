"use client";

import { useEffect, useState } from "react";
import { Info, Share, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  disablePush,
  enablePush,
  getPushSubscription,
  isInstalled,
  isIos,
  pushSupported,
} from "@/lib/push-client";

export function PushToggle() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    getPushSubscription()
      .then((sub) => {
        setIos(isIos());
        const ok = pushSupported();
        setSupported(ok);
        setEnabled(!!sub);
        // The user needs the install guide right now — don't hide it
        if (!ok && !isInstalled()) setShowGuide(true);
      })
      .catch(() => {
        setIos(isIos());
        setSupported(false);
        if (!isInstalled()) setShowGuide(true);
      });
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
              onClick={() => setShowGuide((v) => !v)}
              aria-label="How to add the app to your home screen"
              aria-expanded={showGuide}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Info className="size-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {supported
              ? "Check-ins, challenges, and reminders on this device"
              : "Add the app to your home screen first — steps below"}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={toggle}
          disabled={!supported || busy}
        />
      </div>

      {showGuide && <InstallGuide ios={ios} />}
    </Card>
  );
}

function InstallGuide({ ios }: { ios: boolean }) {
  return (
    <div className="animate-fade-up rounded-2xl bg-muted/50 p-3 text-xs text-muted-foreground">
      <p className="mb-2 font-medium text-foreground">
        Add this app to your home screen
      </p>
      {ios ? (
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>Open this page in Safari (other browsers won&apos;t work)</li>
          <li>
            Tap the Share button{" "}
            <Share className="inline size-3.5 align-[-2px]" aria-hidden /> at
            the bottom of the screen
          </li>
          <li>
            Scroll down and tap <strong>Add to Home Screen</strong>, then{" "}
            <strong>Add</strong>
          </li>
          <li>
            Open <strong>Bathroom</strong> from your home screen and turn this
            toggle on
          </li>
        </ol>
      ) : (
        <ol className="list-decimal space-y-1.5 pl-4">
          <li>
            Tap the three-dot menu{" "}
            <MoreVertical className="inline size-3.5 align-[-2px]" aria-hidden />{" "}
            in your browser
          </li>
          <li>
            Tap <strong>Add to Home screen</strong> (or{" "}
            <strong>Install app</strong>)
          </li>
          <li>
            Open <strong>Bathroom</strong> from your home screen and turn this
            toggle on
          </li>
        </ol>
      )}
    </div>
  );
}
