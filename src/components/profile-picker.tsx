"use client";

import { MEMBER_COLORS, MEMBER_EMOJIS } from "@/lib/client";
import { cn } from "@/lib/utils";

type Props = {
  emoji: string;
  color: string;
  onEmojiChange: (emoji: string) => void;
  onColorChange: (color: string) => void;
};

export function ProfilePicker({
  emoji,
  color,
  onEmojiChange,
  onColorChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {MEMBER_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onEmojiChange(e)}
            className={cn(
              "flex size-10 items-center justify-center rounded-xl text-xl transition-colors",
              e === emoji
                ? "bg-primary/10 ring-2 ring-primary"
                : "bg-muted hover:bg-muted/70",
            )}
            aria-label={`Avatar ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {MEMBER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            className={cn(
              "size-8 rounded-full transition-transform",
              c === color && "scale-110 ring-2 ring-foreground ring-offset-2",
            )}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
