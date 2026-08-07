"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/time";

export function Countdown({
  until,
  onExpire,
  className,
}: {
  until: string;
  onExpire?: () => void;
  className?: string;
}) {
  const [remaining, setRemaining] = useState(
    () => new Date(until).getTime() - Date.now(),
  );

  useEffect(() => {
    const tick = () => {
      const ms = new Date(until).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0) onExpire?.();
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [until, onExpire]);

  return (
    <span className={className} suppressHydrationWarning>
      {formatCountdown(remaining)}
    </span>
  );
}
