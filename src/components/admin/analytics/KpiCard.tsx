"use client";

import * as React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
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
      {/* Ярлык — отдельной строкой, ни с чем не конкурирует (может переноситься) */}
      <div className="flex items-start gap-1 text-[11px] font-semibold uppercase leading-tight tracking-[0.04em] text-ink-subtle">
        <span className="min-w-0">{title}</span>
        {metric ? <span className="shrink-0"><MetricTooltip metric={metric} /></span> : null}
      </div>

      {/* Значение + дельта-чип на одной базовой линии (дельта рядом с числом) */}
      <div className="mt-2 flex items-baseline gap-2">
        <p className="min-w-0 flex-1 truncate text-[24px] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</p>
        {showDelta ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums",
              good ? "bg-[#0a7d3e]/10 text-[#0a7d3e]" : "bg-[#c01818]/10 text-[#c01818]"
            )}
          >
            {delta!.direction === "up" ? <ArrowUpRight className="size-3 shrink-0" strokeWidth={2.75} /> : <ArrowDownRight className="size-3 shrink-0" strokeWidth={2.75} />}
            {delta!.percent.toFixed(1).replace(".", ",")}%
          </span>
        ) : null}
      </div>

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
