"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, TextInput, AdminButton } from "@/components/admin/form";
import { TRADE_IN_STATUS_LABELS } from "@/lib/trade-in/options";
import { setTradeInStatus, setTradeInFinalPrice } from "./actions";

export function TradeInLeadActions({ id, status, finalPrice }: { id: string; status: string; finalPrice: number | null }) {
  const router = useRouter();
  const [price, setPrice] = React.useState(finalPrice ? String(finalPrice) : "");
  const [busy, setBusy] = React.useState(false);

  const changeStatus = async (next: string) => {
    setBusy(true);
    const res = await setTradeInStatus(id, next);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else { toast.success("Статус обновлён"); router.refresh(); }
  };

  const saveFinal = async () => {
    const n = parseInt(price.replace(/\D/g, ""), 10);
    if (Number.isNaN(n)) return;
    setBusy(true);
    const res = await setTradeInFinalPrice(id, n);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else { toast.success("Финальная цена сохранена"); router.refresh(); }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select value={status} onChange={(e) => changeStatus(e.target.value)} disabled={busy} className="w-40">
        {Object.entries(TRADE_IN_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
      <div className="inline-flex items-center gap-1">
        <TextInput value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Фин. ₽" inputMode="numeric" className="w-24" />
        <AdminButton size="sm" variant="outline" loading={busy} onClick={saveFinal}>OK</AdminButton>
      </div>
    </div>
  );
}
