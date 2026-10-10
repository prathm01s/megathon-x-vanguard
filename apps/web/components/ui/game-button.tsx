import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { GAME_TEXT } from "@/lib/game-style";

// Chunky 3D game button: a darker bottom edge that the button "presses" into (§9.1: ≥ 44px).
const TONES = {
  gold: "bg-gradient-to-b from-[#ffd84d] to-[#f5a524] text-[#4a2b05] border-[#b86e0a]",
  green: "bg-gradient-to-b from-[#7ee04f] to-[#3fa52a] text-white border-[#2a7419]",
  blue: "bg-gradient-to-b from-[#5cb8ff] to-[#2d7fe0] text-white border-[#1d5aa6]",
  stone: "bg-gradient-to-b from-[#f2ece0] to-[#d8cdb8] text-[#1e2a4a] border-[#a8987c]",
} as const;

export function GameButton({
  tone = "gold",
  className,
  ...props
}: ComponentProps<"button"> & { tone?: keyof typeof TONES }) {
  return (
    <button
      type="button"
      className={cn(
        GAME_TEXT,
        "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-b-[6px] px-5 text-lg shadow-md transition-transform",
        "active:translate-y-[3px] active:border-b-[3px] disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50",
        "[&_svg]:size-6 [&_svg]:shrink-0",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
