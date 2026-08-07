"use client";

import { createContext, useContext } from "react";
import { useStatus } from "@/hooks/use-status";
import { BottomNav } from "@/components/bottom-nav";
import type { StatusPayload } from "@/lib/types";

type StatusContextValue = {
  data: StatusPayload | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const StatusContext = createContext<StatusContextValue | null>(null);

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const status = useStatus();
  return (
    <StatusContext.Provider value={status}>
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-24">
        {children}
      </div>
      <BottomNav unreadCount={status.data?.unreadCount ?? 0} />
    </StatusContext.Provider>
  );
}

export function useStatusContext() {
  const ctx = useContext(StatusContext);
  if (!ctx) throw new Error("useStatusContext must be used within StatusProvider");
  return ctx;
}
