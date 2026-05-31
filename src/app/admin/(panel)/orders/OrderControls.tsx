"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminButton, Select } from "@/components/admin/form";
import type { OrderStatusDef } from "@/lib/orders/statuses";
import { setOrderStatus, updateOrderNotes } from "./actions";

export function OrderStatusControl({
  id,
  status,
  statuses,
}: {
  id: string;
  status: string;
  statuses: OrderStatusDef[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [target, setTarget] = React.useState(status);

  const labelFor = (key: string) => statuses.find((s) => s.key === key)?.label ?? key;

  const apply = () =>
    start(async () => {
      const res = await setOrderStatus(id, target);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Статус: ${labelFor(target)}`);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <Select value={target} onChange={(e) => setTarget(e.target.value)} disabled={pending}>
        {statuses.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </Select>
      <AdminButton
        type="button"
        size="sm"
        variant={target === "cancelled" ? "danger" : "primary"}
        disabled={pending || target === status}
        onClick={apply}
      >
        {target === status ? "Текущий статус" : `Установить: ${labelFor(target)}`}
      </AdminButton>
    </div>
  );
}

export function OrderNotes({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const save = () =>
    start(async () => {
      const res = await updateOrderNotes(id, value);
      if (res.error) toast.error(res.error);
      else toast.success("Заметка сохранена");
    });
  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Внутренние заметки по заказу…"
        className="min-h-[88px] w-full rounded-sm border border-border bg-white px-3 py-2 text-[14px] leading-relaxed text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
      />
      <AdminButton type="button" size="sm" variant="outline" onClick={save} loading={pending}>
        Сохранить заметку
      </AdminButton>
    </div>
  );
}
