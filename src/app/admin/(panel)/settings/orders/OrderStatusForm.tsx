"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Field, TextInput, Select, AdminButton } from "@/components/admin/form";
import { StatusBadge } from "@/components/admin/ui";
import { ORDER_TONE_OPTIONS, type OrderStatusDef, type OrderStatusTone } from "@/lib/orders/statuses";
import { saveOrderStatuses, resetOrderStatuses } from "./actions";

type Row = OrderStatusDef;

export function OrderStatusForm({ initial }: { initial: OrderStatusDef[] }) {
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[]>(initial);
  const [pending, start] = React.useTransition();

  const patch = (i: number, p: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const add = () =>
    setRows((r) => [...r, { key: "", label: "", customerLabel: "", tone: "neutral" }]);

  const save = () =>
    start(async () => {
      const res = await saveOrderStatuses(rows);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Статусы сохранены");
      router.refresh();
    });

  const reset = () =>
    start(async () => {
      const res = await resetOrderStatuses();
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Сброшено к стандартным");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="grid grid-cols-[1fr_1fr_150px_auto] gap-3 border-b border-border bg-surface px-4 py-2.5 text-[12px] font-medium text-ink-muted">
          <span>Название (админка)</span>
          <span>Название для клиента (ЛК)</span>
          <span>Цвет</span>
          <span className="text-right">Порядок</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_150px_auto] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0">
            <div>
              <TextInput
                value={row.label}
                placeholder="Напр. Подтверждён"
                onChange={(e) => patch(i, { label: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <TextInput
                value={row.customerLabel}
                placeholder="Как видит клиент"
                onChange={(e) => patch(i, { customerLabel: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={row.tone}
                onChange={(e) => patch(i, { tone: e.target.value as OrderStatusTone })}
              >
                {ORDER_TONE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center justify-end gap-1">
              <StatusBadge tone={row.tone}>{row.customerLabel || row.label || "—"}</StatusBadge>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-ink-muted hover:bg-surface disabled:opacity-30" aria-label="Вверх">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded p-1 text-ink-muted hover:bg-surface disabled:opacity-30" aria-label="Вниз">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => remove(i)} className="rounded p-1 text-sale hover:bg-sale/5" aria-label="Удалить">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminButton type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Добавить статус
        </AdminButton>
        <AdminButton type="button" variant="primary" size="sm" onClick={save} loading={pending}>
          Сохранить
        </AdminButton>
        <AdminButton type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}>
          <RotateCcw className="h-4 w-4" /> Сбросить к стандартным
        </AdminButton>
      </div>
      <p className="text-[12px] text-ink-subtle">
        «Название (админка)» видят менеджеры, «Название для клиента» — покупатель в личном кабинете. Порядок задаёт последовательность в выпадающем списке смены статуса.
      </p>
    </div>
  );
}
