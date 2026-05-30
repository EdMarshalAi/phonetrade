"use client";

import * as React from "react";
import { Popover } from "@base-ui-components/react/popover";
import { Info } from "lucide-react";
import { METRICS } from "@/lib/analytics/glossary";

/** Иконка-подсказка рядом с названием метрики. Открывается кликом (работает на мобильных). */
export function MetricTooltip({ metric }: { metric: string }) {
  const info = METRICS[metric];
  if (!info) return null;
  return (
    <Popover.Root>
      <Popover.Trigger
        render={(props) => (
          <button
            {...props}
            type="button"
            aria-label={`Подсказка: ${info.title}`}
            className="inline-flex items-center justify-center rounded-sm text-ink-subtle transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          >
            <Info className="size-3.5" strokeWidth={2} aria-hidden />
          </button>
        )}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} side="top" align="start" className="z-[100]">
          <Popover.Popup
            className={[
              "max-w-[300px] rounded-xl border border-border/70 bg-white p-4 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-150",
            ].join(" ")}
          >
            <p className="text-[13.5px] font-semibold text-ink">{info.title}</p>
            <div className="mt-2 space-y-2.5">
              <Section label="Что это" text={info.what} />
              {info.how ? <Section label="Как считается" text={info.how} /> : null}
              <Section label="На что обращать внимание" text={info.watch} />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">{label}</p>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{text}</p>
    </div>
  );
}
