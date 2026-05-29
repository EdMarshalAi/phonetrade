import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  label: string;
  className?: string;
  tone?: "light" | "dark";
  ratio?: "square" | "video" | "card" | "hero";
};

const ratioClass: Record<NonNullable<Props["ratio"]>, string> = {
  square: "aspect-square",
  video: "aspect-video",
  card: "aspect-[4/5]",
  hero: "aspect-[5/6] md:aspect-[4/5]",
};

/**
 * Lightweight visual placeholder used while real product imagery isn't in
 * /public yet. Renders a soft gradient + label so layout/spacing is testable.
 */
export function ImagePlaceholder({
  label,
  className,
  tone = "light",
  ratio = "square",
}: Props) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative w-full overflow-hidden rounded-xl flex items-center justify-center text-center text-xs tracking-wide",
        ratioClass[ratio],
        tone === "light"
          ? "bg-gradient-to-br from-surface to-white text-ink-subtle"
          : "bg-gradient-to-br from-[#2a2a2c] to-[#1d1d1f] text-onDark-muted",
        className
      )}
    >
      <span className="px-3 leading-snug">[{label}]</span>
    </div>
  );
}
