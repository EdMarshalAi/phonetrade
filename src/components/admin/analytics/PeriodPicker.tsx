"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { PERIOD_LABELS, type PeriodPreset } from "@/lib/analytics/dateRange";
import { Switch } from "@/components/admin/form";

const PRESETS = Object.keys(PERIOD_LABELS) as PeriodPreset[];

/** Sticky-пикер периода: пресеты + тумблер сравнения с прошлым периодом. Состояние в URL. */
export function PeriodPicker({ period, compare }: { period: PeriodPreset; compare: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-white p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setParam({ period: p })}
            className={cn(
              "h-8 rounded-[6px] px-3 text-[13px] font-medium transition-colors",
              period === p ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      <Switch checked={compare} onChange={(v) => setParam({ compare: String(v) })} label="Сравнить с прошлым периодом" />
    </div>
  );
}
