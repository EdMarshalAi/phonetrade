"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function CustomerTabs({ items }: { items: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = React.useState(0);
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={cn(
              "-mb-px h-10 border-b-2 px-4 text-[13.5px] font-medium transition-colors",
              active === i ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{items[active]?.content}</div>
    </div>
  );
}
