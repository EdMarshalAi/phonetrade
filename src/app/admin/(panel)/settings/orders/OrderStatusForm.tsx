"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AdminButton } from "@/components/admin/form";
import { ORDER_STATUS_COLORS, ORDER_BADGE_BASE, colorEntry, type OrderStatusDef } from "@/lib/orders/statuses";
import { cn } from "@/lib/utils/cn";
import { saveOrderStatuses, resetOrderStatuses } from "./actions";

type Row = OrderStatusDef;

export function OrderStatusForm({ initial }: { initial: OrderStatusDef[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>(initial);
  const [pending, start] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);
  const [drag, setDrag] = React.useState<number | null>(null);
  const [palette, setPalette] = React.useState<number | null>(null); // индекс открытой палитры

  const update = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };
  const patch = (i: number, p: Partial<Row>) => update(rows.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
  const remove = (i: number) => update(rows.filter((_, idx) => idx !== i));
  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return;
    const copy = [...rows];
    const [it] = copy.splice(from, 1);
    copy.splice(to, 0, it);
    update(copy);
  };
  const add = () => update([...rows, { key: "", label: "", customerLabel: "", color: "slate" }]);

  const save = () =>
    start(async () => {
      const res = await saveOrderStatuses(rows);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Статусы сохранены");
      setDirty(false);
      router.refresh();
    });

  const reset = () =>
    start(async () => {
      const res = await resetOrderStatuses();
      if (res.error) { toast.error(res.error); return; }
      toast.success("Сброшено к стандартным");
      setDirty(false);
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 py-3">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-subtle">Цвет · название · превью</p>
          <p className="text-[12px] text-ink-subtle">{rows.length} статусов · тяните за <GripVertical className="inline h-3.5 w-3.5 -mt-0.5" /> для порядка</p>
        </div>

        <ul className="divide-y divide-border/50">
          {rows.map((row, i) => {
            const c = colorEntry(row.color);
            return (
              <li
                key={i}
                draggable
                onDragStart={() => setDrag(i)}
                onDragEnter={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { moveTo(drag, i); setDrag(i); } }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => setDrag(null)}
                className={cn(
                  "group flex items-center gap-4 px-5 py-3.5 transition-colors",
                  drag === i ? "bg-surface opacity-60" : "hover:bg-surface/40"
                )}
              >
                <span className="shrink-0 cursor-grab text-ink-subtle/30 transition-colors group-hover:text-ink-subtle/70 active:cursor-grabbing" aria-hidden>
                  <GripVertical className="h-4 w-4" />
                </span>

                {/* выбор цвета из палитры */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setPalette(palette === i ? null : i)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1.5 transition-colors hover:border-ink/30"
                    aria-label="Выбрать цвет"
                  >
                    <span className={cn("h-4 w-4 rounded-full", c.dot)} />
                    <ChevronDown className="h-3.5 w-3.5 text-ink-subtle" />
                  </button>
                  {palette === i ? (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPalette(null)} />
                      <div className="absolute left-0 top-full z-20 mt-1.5 grid grid-cols-5 gap-1.5 rounded-xl border border-border/70 bg-white p-2 shadow-lg">
                        {ORDER_STATUS_COLORS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            title={opt.label}
                            onClick={() => { patch(i, { color: opt.key }); setPalette(null); }}
                            className={cn(
                              "h-7 w-7 rounded-full transition-transform hover:scale-110",
                              opt.dot,
                              row.color === opt.key ? "outline outline-2 outline-ink outline-offset-2" : ""
                            )}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>

                {/* названия */}
                <div className="min-w-0 flex-1">
                  <input
                    value={row.label}
                    placeholder="Название в админке"
                    onChange={(e) => patch(i, { label: e.target.value })}
                    className="w-full rounded-md bg-transparent px-2 py-0.5 text-[15px] font-medium text-ink placeholder:font-normal placeholder:text-ink-subtle/50 transition-colors hover:bg-surface/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-ink/15"
                  />
                  <input
                    value={row.customerLabel}
                    placeholder="Как видит клиент в кабинете"
                    onChange={(e) => patch(i, { customerLabel: e.target.value })}
                    className="mt-0.5 w-full rounded-md bg-transparent px-2 py-0.5 text-[13px] text-ink-muted placeholder:text-ink-subtle/50 transition-colors hover:bg-surface/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-ink/15"
                  />
                </div>

                {/* живой превью */}
                <div className="hidden w-44 shrink-0 justify-end sm:flex">
                  <span className={cn(ORDER_BADGE_BASE, c.badge)}>{row.customerLabel || row.label || "—"}</span>
                </div>

                {/* реордер (fallback к drag) + удаление */}
                <div className="flex shrink-0 items-center">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => moveTo(i, i - 1)} disabled={i === 0} className="rounded text-ink-subtle/60 transition-colors hover:text-ink disabled:opacity-25" aria-label="Выше">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => moveTo(i, i + 1)} disabled={i === rows.length - 1} className="rounded text-ink-subtle/60 transition-colors hover:text-ink disabled:opacity-25" aria-label="Ниже">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button type="button" onClick={() => remove(i)} className="ml-1 rounded-md p-1.5 text-ink-subtle/60 transition-colors hover:bg-sale/5 hover:text-sale" aria-label="Удалить статус">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-border py-3 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface/50 hover:text-ink active:scale-[0.998]"
        >
          <Plus className="h-4 w-4" /> Добавить статус
        </button>
      </div>

      <div className="flex items-center gap-3">
        <AdminButton type="button" variant="primary" size="sm" onClick={save} loading={pending} disabled={!dirty}>
          Сохранить изменения
        </AdminButton>
        <AdminButton type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}>
          <RotateCcw className="h-4 w-4" /> Сбросить к стандартным
        </AdminButton>
        <span className="ml-auto text-[12px] text-ink-subtle">Порядок (drag / ↑↓) = последовательность в списке смены статуса</span>
      </div>
    </div>
  );
}
