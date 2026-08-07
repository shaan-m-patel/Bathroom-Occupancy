"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MemberDto } from "@/lib/types";

export function HouseholdCard({
  name,
  inviteCode,
  members,
  meId,
}: {
  name: string;
  inviteCode: string;
  members: MemberDto[];
  meId: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="gap-4 rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">{name}</h2>
          <p className="text-xs text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl font-mono" onClick={copy}>
          {copied ? "Copied ✓" : inviteCode}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm"
            style={{ borderColor: `${m.color}66`, backgroundColor: `${m.color}1a` }}
          >
            <span>{m.emoji}</span>
            <span className="font-medium">
              {m.id === meId ? "You" : m.name}
            </span>
            {m.isAdmin && (
              <span className="text-[10px] text-muted-foreground">admin</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Share the invite code so others can join from the welcome screen.
      </p>
    </Card>
  );
}
