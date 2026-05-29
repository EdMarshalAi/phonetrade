"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FacetOption } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils/cn";

type Props = {
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
};

export function SubcategoryRail({ options, selected, onToggle }: Props) {
  const scrollerRef = React.useRef<HTMLUListElement | null>(null);
  const [canLeft, setCanLeft] = React.useState(false);
  const [canRight, setCanRight] = React.useState(false);

  const updateArrows = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, options.length]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (!options || options.length === 0) return null;

  return (
    <div className="relative">
      {/* Edge masks */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-12 z-10",
          "bg-gradient-to-r from-bg to-transparent transition-opacity duration-200",
          canLeft ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-12 z-10",
          "bg-gradient-to-l from-bg to-transparent transition-opacity duration-200",
          canRight ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Arrow buttons */}
      <button
        type="button"
        aria-label="Прокрутить влево"
        onClick={() => scrollBy(-320)}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-20 inline-flex size-9 items-center justify-center rounded-full bg-white border border-border/60 text-ink hover:bg-surface transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
          canLeft
            ? "opacity-100 pointer-events-auto translate-x-[-2px]"
            : "opacity-0 pointer-events-none translate-x-[6px]"
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Прокрутить вправо"
        onClick={() => scrollBy(320)}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-20 inline-flex size-9 items-center justify-center rounded-full bg-white border border-border/60 text-ink hover:bg-surface transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]",
          canRight
            ? "opacity-100 pointer-events-auto translate-x-[2px]"
            : "opacity-0 pointer-events-none translate-x-[-6px]"
        )}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>

      <ul
        ref={scrollerRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide scroll-smooth py-1"
        role="tablist"
        aria-label="Подкатегории"
      >
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <li key={opt.value} className="shrink-0">
              <button
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onToggle(opt.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-ink text-white"
                    : "bg-white border border-border/60 text-ink hover:bg-surface"
                )}
              >
                {opt.value}
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    active ? "text-white/70" : "text-ink-subtle"
                  )}
                >
                  {opt.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
