"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, GripVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Select, AdminButton } from "@/components/admin/form";
import { StatusBadge } from "@/components/admin/ui";
import { ORDER_TONE_OPTIONS, type OrderStatusDef, type OrderStatusTone } from "@/lib/orders/statuses";
import { cn } from "@/lib/utils/cn";
import { saveOrderStatuses, resetOrderStatuses } from "./actions";

type Row = OrderStatusDef;

const SWATCH: Record<OrderStatusTone, string> = {
  neutral: "bg-ink-subtle/40",
  outline: "bg-white ring-1 ring-border",
  strong: "bg-ink",
  danger: "bg-sale",
};

export function OrderStatusForm({ initial }: { initial: OrderStatusDef[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>(initial);
  const [pending, start] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);

  const update = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };
  const patch = (i: number, p: Partial<Row>) => update(rows.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
  const remove = (i: number) => update(rows.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = [...rows];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    update(copy);
  };
  const add = () => update([...rows, { key: "", label: "", customerLabel: "", tone: "neutral" }]);

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

  const cols = "grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_8.5rem_7rem_4.5rem]";

  return (
    <div className="max-w-5xl space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        {/* header */}
        <div className={cn("grid items-center gap-3 border-b border-border bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-subtle", cols)}>
          <span />
          <span>Название · админка</span>
          <span>Название · кабинет клиента</span>
          <span>Цвет</span>
          <span>Превью</span>
          <span className="text-right">&nbsp;</span>
        </div>

        {rows.map((row, i) => (
          <div key={i} className={cn("grid items-center gap-3 border-b border-border/50 px-3 py-1.5 last:border-0 hover:bg-surface/40", cols)}>
            <span className="flex items-center justify-center text-ink-subtle/50" aria-hidden>
              <GripVertical className="h-4 w-4" />
            </span>

            <input
              value={row.label}
              placeholder="Подтверждён"
              onChange={(e) => patch(i, { label: e.target.value })}
              className="h-9 w-full rounded-md border border-border bg-white px-2.5 text-[13.5px] text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
            />
            <input
              value={row.customerLabel}
              placeholder="как видит клиент"
              onChange={(e) => patch(i, { customerLabel: e.target.value })}
              className="h-9 w-full rounded-md border border-border bg-white px-2.5 text-[13.5px] text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
            />

            <div className="flex items-center gap-2">
              <span className={cn("h-3 w-3 shrink-0 rounded-full", SWATCH[row.tone])} aria-hidden />
              <Select value={row.tone} onChange={(e) => patch(i, { tone: e.target.value as OrderStatusTone })} className="w-full">
                {ORDER_TONE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>

            <div className="min-w-0">
              <StatusBadge tone={row.tone}>{row.customerLabel || row.label || "—"}</StatusBadge>
            </div>

            <div className="flex items-center justify-end gap-0.5">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-muted hover:bg-surface disabled:opacity-25" aria-label="Выше">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1 text-ink-muted hover:bg-surface disabled:opacity-25" aria-label="Ниже">
                <ChevronDown className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => remove(i)} className="rounded p-1 text-ink-muted hover:bg-sale/5 hover:text-sale" aria-label="Удалить">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={add}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border bg-surface/40 py-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Plus className="h-4 w-4" /> Добавить статус
        </button>
      </div>

      <div className="flex items-center gap-2">
        <AdminButton type="button" variant="primary" size="sm" onClick={save} loading={pending} disabled={!dirty}>
          Сохранить
        </AdminButton>
        <AdminButton type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}>
          <RotateCcw className="h-4 w-4" /> Сбросить к стандартным
        </AdminButton>
        <span className="ml-auto text-[12px] text-ink-subtle">Порядок задаёт последовательность в списке смены статуса.</span>
      </div>
    </div>
  );
}
