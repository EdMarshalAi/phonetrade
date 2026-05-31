"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AdminButton } from "@/components/admin/form";
import { ORDER_BADGE_BASE, normalizeHex, statusBadgeStyle, type OrderStatusDef } from "@/lib/orders/statuses";
import { cn } from "@/lib/utils/cn";
import { saveOrderStatuses, resetOrderStatuses } from "./actions";

type Row = OrderStatusDef;

export function OrderStatusForm({ initial }: { initial: OrderStatusDef[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>(initial);
  const [pending, start] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);
  const [drag, setDrag] = React.useState<number | null>(null);

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
  const add = () => update([...rows, { key: "", label: "", customerLabel: "", color: "#2563eb" }]);

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
          <p className="text-[12px] text-ink-subtle">{rows.length} статусов · тяните за <GripVertical className="inline h-3.5 w-3.5 -mt-0.5" /></p>
        </div>

        <ul className="divide-y divide-border/50">
          {rows.map((row, i) => (
            <li
              key={i}
              draggable
              onDragStart={() => setDrag(i)}
              onDragEnter={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { moveTo(drag, i); setDrag(i); } }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={() => setDrag(null)}
              className={cn(
                "group flex items-center gap-3 px-5 py-3.5 transition-colors",
                drag === i ? "bg-surface opacity-60" : "hover:bg-surface/40"
              )}
            >
              <span className="shrink-0 cursor-grab text-ink-subtle/30 transition-colors group-hover:text-ink-subtle/70 active:cursor-grabbing" aria-hidden>
                <GripVertical className="h-4 w-4" />
              </span>

              {/* выбор цвета — как в Hero: палитра + HEX */}
              <div className="flex shrink-0 items-center gap-1.5">
                <input
                  type="color"
                  aria-label="Цвет статуса"
                  value={normalizeHex(row.color)}
                  onChange={(e) => patch(i, { color: e.target.value })}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-white p-1"
                />
                <input
                  value={row.color}
                  placeholder="#2563eb"
                  onChange={(e) => patch(i, { color: e.target.value })}
                  className="h-9 w-[5.5rem] rounded-md border border-border bg-white px-2 font-mono text-[12px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
                />
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
              <div className="hidden w-40 shrink-0 justify-end sm:flex">
                <span className={ORDER_BADGE_BASE} style={statusBadgeStyle(row.color)}>{row.customerLabel || row.label || "—"}</span>
              </div>

              {/* реордер + удаление */}
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
          ))}
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
