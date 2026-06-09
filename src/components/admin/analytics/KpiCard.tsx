"use client";

import * as React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDelta } from "@/lib/analytics/format";
import { METRICS } from "@/lib/analytics/glossary";
import { MetricTooltip } from "./MetricTooltip";
import { SparkLine } from "./SparkLine";

/**
 * KPI-плитка: подпись + подсказка, дельта vs прошлый период, крупное значение,
 * sparkline и сравнение. Серверные страницы передают готовые значения (числа/строки).
 */
export function KpiCard({
  metric,
  label,
  value,
  current,
  previous,
  spark,
  previousLabel,
}: {
  /** ключ из глоссария (для тултипа и логики «меньше=лучше») */
  metric?: string;
  /** подпись плитки (если не из глоссария) */
  label?: string;
  /** отформатированное главное значение */
  value: string;
  /** числовое текущее (для дельты) */
  current?: number;
  /** числовое прошлое (для дельты) */
  previous?: number;
  /** точки для sparkline */
  spark?: number[];
  /** отформатированное значение прошлого периода («vs 1 108 000 ₽») */
  previousLabel?: string;
}) {
  const info = metric ? METRICS[metric] : undefined;
  const lowerBetter = !!info?.lowerIsBetter;
  const title = label ?? info?.title ?? "";

  const delta = current !== undefined && previous !== undefined ? formatDelta(current, previous) : null;
  const good = delta ? (lowerBetter ? delta.direction === "down" : delta.direction === "up") : true;
  const showDelta = delta && delta.direction !== "flat" && previous !== undefined && previous > 0;

  return (
    <div className="flex flex-col rounded-2xl border border-border/70 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-1.5">
        <span className="inline-flex min-w-0 flex-1 items-center gap-1 text-[11.5px] font-semibold uppercase leading-tight tracking-[0.04em] text-ink-subtle">
          <span className="min-w-0">{title}</span>
          {metric ? <MetricTooltip metric={metric} /> : null}
        </span>
        {showDelta ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[12px] font-semibold tabular-nums",
              good ? "text-[#0a7d3e]" : "text-[#c01818]"
            )}
          >
            {delta!.direction === "up" ? <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={2.5} /> : <ArrowDownRight className="size-3.5 shrink-0" strokeWidth={2.5} />}
            {delta!.percent.toFixed(1).replace(".", ",")}%
          </span>
        ) : delta && previous !== undefined ? (
          <span className="inline-flex shrink-0 items-center text-[12px] text-ink-subtle"><Minus className="size-3.5" /></span>
        ) : (
          <span className="shrink-0 text-[12px] text-ink-subtle">—</span>
        )}
      </div>

      <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</p>

      {spark && spark.length > 1 ? (
        <div className="mt-3">
          <SparkLine points={spark} />
        </div>
      ) : null}

      {previousLabel ? (
        <p className="mt-2 text-[11.5px] text-ink-subtle">{previousLabel}</p>
      ) : null}
    </div>
  );
}

export function KpiRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{children}</div>;
}
