"use client";

import * as React from "react";
import { ImagePlus, Ban } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ICON_SET, resolveIcon } from "@/lib/admin/icons";

/**
 * Компактный выбор иконки: квадратная кнопка показывает ТОЛЬКО иконку (без
 * текстовых имён). По клику — аккуратная сетка-поповер. Очистка — отдельным
 * пунктом «Без иконки» внутри поповера. Хранит kebab-имя.
 */
export function IconPicker({
  value,
  onChange,
  size = "md",
}: {
  value: string | null;
  onChange: (name: string | null) => void;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = React.useState(false);
  const Current = value ? resolveIcon(value) : null;
  const box = size === "sm" ? "size-9" : "size-10";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Выбрать иконку"
        title={value ?? "Выбрать иконку"}
        className={cn(
          box,
          "inline-flex items-center justify-center rounded-lg border bg-white transition-colors",
          open ? "border-ink ring-2 ring-ink/15" : "border-border hover:border-ink/40",
          value ? "text-ink" : "text-ink-subtle"
        )}
      >
        {Current ? (
          <Current className="size-[18px]" strokeWidth={1.75} />
        ) : (
          <ImagePlus className="size-[18px]" strokeWidth={1.75} />
        )}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-[calc(100%+6px)] z-[61] w-[268px] rounded-xl border border-border/70 bg-white p-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]">
            <div className="max-h-60 overflow-auto">
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
                      "flex size-9 items-center justify-center rounded-lg transition-colors",
                      value === name ? "bg-ink text-white" : "text-ink hover:bg-surface"
                    )}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mt-1.5 flex w-full items-center gap-2 rounded-lg border-t border-border/60 px-2 pt-2 text-left text-[12.5px] text-ink-muted hover:text-ink"
            >
              <Ban className="size-3.5" strokeWidth={1.75} /> Без иконки
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
