"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/** Табы аналитики с синхронизацией в URL (?tab=). Период/сравнение сохраняются. */
export function AnalyticsTabs({
  tabs,
  active,
}: {
  tabs: { key: string; label: string }[];
  active: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const href = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", key);
    return `${pathname}?${next.toString()}`;
  };

  return (
    <div className="flex flex-wrap gap-1 border-b border-border/70">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={href(t.key)}
            scroll={false}
            className={cn(
              "relative px-3.5 py-2 text-[13.5px] font-medium transition-colors",
              on ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            {t.label}
            {on ? <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-ink" /> : null}
          </Link>
        );
      })}
    </div>
  );
}
