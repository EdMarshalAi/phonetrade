"use client";

import * as React from "react";
import { Controller, type Control } from "react-hook-form";
import type { ProductFormValues } from "@/lib/admin/schemas";
import type { ProductOption, ProductBadge } from "@/lib/content";
import { Field, Select } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { cn } from "@/lib/utils/cn";

const BASE_FIELDS = ["color", "memory", "sim", "condition"] as const;
type BaseField = (typeof BASE_FIELDS)[number];
function isBaseField(f: string | null): f is BaseField {
  return !!f && (BASE_FIELDS as readonly string[]).includes(f);
}

/**
 * Таб «Опции и Бейджи» карточки товара. Значения опций берутся из реестра
 * (Товары → Настройки → Опции); базовые опции пишутся в свои колонки
 * (color/memory/sim/condition), кастомные — в options[key]. Бейджи — мультивыбор.
 */
export function OptionsBadgesSection({
  control,
  options,
  badges,
}: {
  control: Control<ProductFormValues>;
  options: ProductOption[];
  badges: ProductBadge[];
}) {
  return (
    <div className="space-y-5">
      <Panel className="space-y-4 p-5">
        <PanelTitle>Опции</PanelTitle>
        {options.length === 0 ? (
          <p className="text-[13.5px] text-ink-muted">
            Опции ещё не созданы. Добавьте их в «Товары → Настройки → Опции».
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {options.map((opt) => {
              // Аккумулятор — свободное значение (любой % от 0 до 100), не справочник:
              // число + ползунок, пишется в колонку battery и выводится на карточке как «%».
              if (opt.field === "battery") {
                return (
                  <Field key={opt.key} label={`${opt.label}, %`} hint="Любое значение 0–100 — выводится на карточке">
                    <Controller
                      control={control}
                      name="battery"
                      render={({ field }) => {
                        const num = field.value == null || field.value === "" ? null : Number(field.value);
                        return (
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              step={1}
                              value={num ?? 0}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="h-1.5 flex-1 cursor-pointer accent-[var(--color-ink)]"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={num ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                placeholder="—"
                                className="h-10 w-16 rounded-lg border border-border bg-white px-2 text-right text-[13px] text-ink tabular-nums outline-none focus:border-ink/40"
                              />
                              <span className="text-[13px] text-ink-subtle">%</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </Field>
                );
              }
              const name = (isBaseField(opt.field) ? opt.field : `options.${opt.key}`) as
                | BaseField
                | `options.${string}`;
              return (
                <Field key={opt.key} label={opt.label} hint={`${opt.values.length} значений в справочнике`}>
                  <Controller
                    control={control}
                    name={name as never}
                    render={({ field }) => (
                      <Select
                        value={(field.value as string) ?? ""}
                        onChange={(e) => field.onChange(e.target.value || (isBaseField(opt.field) ? "" : undefined))}
                      >
                        <option value="">— Не указано —</option>
                        {opt.values.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    )}
                  />
                </Field>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Бейджи</PanelTitle>
        {badges.length === 0 ? (
          <p className="text-[13.5px] text-ink-muted">
            Бейджи ещё не созданы. Добавьте их в «Товары → Настройки → Бейджики».
          </p>
        ) : (
          <Controller
            control={control}
            name="badges"
            render={({ field }) => {
              const selected = new Set<string>((field.value as string[]) ?? []);
              const toggle = (key: string) => {
                const next = new Set(selected);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                // сохраняем порядок реестра
                field.onChange(badges.filter((b) => next.has(b.key)).map((b) => b.key));
              };
              return (
                <div className="flex flex-wrap gap-2">
                  {badges.map((b) => {
                    const on = selected.has(b.key);
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => toggle(b.key)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                          on ? "border-ink bg-ink/[0.04]" : "border-border bg-white hover:bg-surface"
                        )}
                      >
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-black/[0.04]"
                          style={{ backgroundColor: b.bg, color: b.fg }}
                        >
                          {b.label}
                        </span>
                        <span className={cn("text-[12px]", on ? "text-ink" : "text-ink-subtle")}>
                          {on ? "включён" : "выключен"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            }}
          />
        )}
      </Panel>
    </div>
  );
}
