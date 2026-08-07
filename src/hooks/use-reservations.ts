"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChallengeDto, MemberDto, ReservationDto } from "@/lib/types";

export type ReservationEntry = {
  reservation: ReservationDto;
  member: MemberDto;
  challenges: ChallengeDto[];
};

export function useReservations(day: Date) {
  const [entries, setEntries] = useState<ReservationEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dayKey = day.toDateString();

  const refresh = useCallback(() => {
    const from = new Date(dayKey);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return fetch(
      `/api/reservations?from=${from.toISOString()}&to=${to.toISOString()}`,
      { cache: "no-store" },
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load reservations");
        return res.json();
      })
      .then((data) => {
        setEntries(data.reservations);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, [dayKey]);

  // Reset the list during render when the selected day changes
  const [prevKey, setPrevKey] = useState(dayKey);
  if (prevKey !== dayKey) {
    setPrevKey(dayKey);
    setEntries(null);
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, error, refresh };
}
