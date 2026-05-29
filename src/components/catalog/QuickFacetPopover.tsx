"use client";

import * as React from "react";
import { Popover } from "@base-ui-components/react/popover";
import { Check, ChevronDown } from "lucide-react";
import type { FacetOption } from "@/lib/catalog/filters";
import { cn } from "@/lib/utils/cn";

type Props = {
  label: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear?: () => void;
};

export function QuickFacetPopover({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: Props) {
  if (!options || options.length === 0) return null;
  const active = selected.length > 0;

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
            {label}
            {active && (
              <span className="text-[11px] opacity-80 tabular-nums">
                · {selected.length}
              </span>
            )}
            <ChevronDown
              className="size-3.5 opacity-70 group-data-[popup-open]:rotate-180 transition-transform"
              aria-hidden
            />
          </button>
        )}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start" className="z-[60]">
          <Popover.Popup
            className={cn(
              "w-[260px] max-h-[420px] overflow-y-auto rounded-2xl bg-white border border-border/60 p-2",
              "shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
              "data-[starting-style]:scale-95 data-[ending-style]:scale-95",
              "origin-top-left transition-[opacity,transform] duration-150"
            )}
          >
            <ul className="flex flex-col">
              {options.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => onToggle(opt.value)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm text-ink hover:bg-surface text-left transition-colors"
                    >
                      <span className="inline-flex items-center gap-3 min-w-0">
                        <span
                          aria-hidden
                          className={cn(
                            "inline-flex size-[18px] items-center justify-center rounded-md border shrink-0 transition-all",
                            checked
                              ? "bg-ink border-ink text-white"
                              : "border-border bg-white"
                          )}
                        >
                          {checked && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        <span className="truncate">{opt.value}</span>
                      </span>
                      <span className="text-[11px] text-ink-subtle tabular-nums shrink-0">
                        {opt.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {active && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="mt-1 w-full text-[12px] text-ink-muted hover:text-ink py-2 transition-colors"
              >
                Сбросить
              </button>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
