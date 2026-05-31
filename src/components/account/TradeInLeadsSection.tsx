"use client";

import * as React from "react";
import { Repeat } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getMyTradeInLeads, type MyTradeInLead } from "@/lib/trade-in/trade-in-actions";
import { TRADE_IN_STATUS_LABELS } from "@/lib/trade-in/options";
import { cn } from "@/lib/utils/cn";

const money = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("ru-RU").format(n) + " ₽");
const dateFmt = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected" || status === "cancelled") return "bg-ink/5 text-ink-muted";
  return "bg-blue-50 text-blue-700";
}

export function TradeInLeadsSection() {
  const { user } = useAuth();
  const [leads, setLeads] = React.useState<MyTradeInLead[] | null>(null);

  React.useEffect(() => {
    if (!user) return;
    getMyTradeInLeads(user.phone).then(setLeads).catch(() => setLeads([]));
  }, [user]);

  return (
    <div className="rounded-3xl border border-border/60 bg-white p-6 md:p-8">
      <div className="flex items-center gap-3">
        <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-2xl bg-surface text-ink">
          <Repeat className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-ink">Мои заявки на trade-in</h2>
          <p className="text-[13px] text-ink-muted">Оценки и выкуп ваших устройств.</p>
        </div>
      </div>

      {leads === null ? (
        <p className="mt-6 text-[14px] text-ink-muted">Загрузка…</p>
      ) : leads.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-surface p-6 text-center">
          <p className="text-[15px] text-ink">Заявок пока нет</p>
          <p className="mt-1 text-[13px] text-ink-muted">Оцените свой iPhone на странице trade-in.</p>
          <a href="/trade-in" className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-ink/85">Узнать цену</a>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {leads.map((l) => (
            <li key={l.lead_number} className="rounded-2xl border border-border/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink">{l.model_title} {l.memory_gb}GB</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">№ {l.lead_number} · {dateFmt(l.created_at)}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide", statusTone(l.status))}>
                  {TRADE_IN_STATUS_LABELS[l.status] ?? l.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
                <span className="text-ink-muted">Предв. цена: <span className="font-medium text-ink tabular-nums">{money(l.estimated_price_rub)}</span></span>
                {l.final_price_rub != null && <span className="text-ink-muted">Финальная: <span className="font-medium text-emerald-700 tabular-nums">{money(l.final_price_rub)}</span></span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
