"use client";

import * as React from "react";
import { Popover } from "@base-ui-components/react/popover";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  min: number;
  max: number;
  value: { min?: number; max?: number };
  onApply: (next: { min?: number; max?: number }) => void;
};

function format(n: number): string {
  return n.toLocaleString("ru-RU");
}

export function QuickPricePopover({ min, max, value, onApply }: Props) {
  const [draftMin, setDraftMin] = React.useState<string>(
    typeof value.min === "number" ? String(value.min) : ""
  );
  const [draftMax, setDraftMax] = React.useState<string>(
    typeof value.max === "number" ? String(value.max) : ""
  );

  React.useEffect(() => {
    setDraftMin(typeof value.min === "number" ? String(value.min) : "");
    setDraftMax(typeof value.max === "number" ? String(value.max) : "");
  }, [value.min, value.max]);

  const active =
    typeof value.min === "number" || typeof value.max === "number";

  const summary = active
    ? `${value.min ?? "от"} – ${value.max ?? "до"} ₽`
    : null;

  const apply = () => {
    const a = draftMin === "" ? undefined : Number(draftMin);
    const b = draftMax === "" ? undefined : Number(draftMax);
    onApply({
      min: Number.isFinite(a) ? (a as number) : undefined,
      max: Number.isFinite(b) ? (b as number) : undefined,
    });
  };

  const clear = () => {
    setDraftMin("");
    setDraftMax("");
    onApply({ min: undefined, max: undefined });
  };

  return (
    <Popover.Root>
      <Popover.Trigger
        nativeButton
        render={(props) => (
          <button
            {...props}
            type="button"
            className={cn(
              "shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium transition-colors",
              active
                ? "bg-ink text-white"
                : "bg-surface text-ink hover:bg-border/60"
            )}
          >
            Цена
            {summary && (
              <span className="text-[11px] opacity-80 tabular-nums">
                · {summary}
              </span>
            )}
            <ChevronDown className="size-3.5 opacity-70" aria-hidden />
          </button>
        )}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-[60]">
          <Popover.Popup
            className={cn(
              "w-[300px] rounded-2xl bg-white border border-border/60 p-4",
              "shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[starting-style]:scale-95 data-[ending-style]:scale-95",
              "origin-top-left transition-[opacity,transform] duration-150"
            )}
          >
            <p className="text-xs text-ink-subtle mb-3 tabular-nums">
              В наличии {format(min)} – {format(max)} ₽
            </p>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(min)}
                value={draftMin}
                onChange={(e) => setDraftMin(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface text-sm text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors"
                aria-label="Минимальная цена"
              />
              <span className="text-ink-subtle">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={String(max)}
                value={draftMax}
                onChange={(e) => setDraftMax(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface text-sm text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors"
                aria-label="Максимальная цена"
              />
            </div>
            <div className="flex items-center gap-2">
              {active && (
                <button
                  type="button"
                  onClick={clear}
                  className="flex-1 inline-flex items-center justify-center h-9 rounded-xl text-[13px] font-medium text-ink hover:bg-surface transition-colors"
                >
                  Сбросить
                </button>
              )}
              <button
                type="button"
                onClick={apply}
                className="flex-1 inline-flex items-center justify-center h-9 rounded-xl bg-ink text-white text-[13px] font-medium hover:bg-ink/85 transition-colors"
              >
                Применить
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
