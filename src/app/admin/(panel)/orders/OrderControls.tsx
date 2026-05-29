"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminButton } from "@/components/admin/form";
import { ORDER_STATUS, ORDER_TRANSITIONS } from "./labels";
import { setOrderStatus, updateOrderNotes } from "./actions";

export function OrderStatusControl({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const allowed = ORDER_TRANSITIONS[status] ?? [];

  const move = (to: string) =>
    start(async () => {
      const res = await setOrderStatus(id, to);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Статус: ${ORDER_STATUS[to] ?? to}`);
      router.refresh();
    });

  if (allowed.length === 0) {
    return <p className="text-[13px] text-ink-subtle">Финальный статус — переходов нет.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {allowed.map((to) => (
        <AdminButton
          key={to}
          type="button"
          size="sm"
          variant={to === "cancelled" ? "danger" : "primary"}
          disabled={pending}
          onClick={() => move(to)}
        >
          {ORDER_STATUS[to] ?? to}
        </AdminButton>
      ))}
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
