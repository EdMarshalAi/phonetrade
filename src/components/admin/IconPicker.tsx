"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ICON_SET, resolveIcon } from "@/lib/admin/icons";

/**
 * Визуальный выбор иконки из единого набора (в интерфейсе, не браузерный).
 * Хранит kebab-имя иконки. Кнопка показывает текущую иконку; по клику —
 * сетка иконок.
 */
export function IconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (name: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const Current = resolveIcon(value);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-sm border border-border bg-white px-3 text-[14px] text-ink hover:bg-surface"
      >
        <Current className="h-4.5 w-4.5 text-ink" strokeWidth={1.75} />
        <span className="text-ink-muted">{value || "Выбрать иконку"}</span>
        <ChevronDown className={cn("h-4 w-4 text-ink-subtle transition-transform", open && "rotate-180")} strokeWidth={2} />
        {value ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="ml-1 rounded-sm p-0.5 text-ink-subtle hover:text-sale"
            aria-label="Очистить"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-72 rounded-md border border-border/70 bg-white p-2 shadow-lg">
            <div className="grid grid-cols-7 gap-1">
              {ICON_SET.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-sm transition-colors",
                    value === name ? "bg-ink text-white" : "text-ink hover:bg-surface"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
