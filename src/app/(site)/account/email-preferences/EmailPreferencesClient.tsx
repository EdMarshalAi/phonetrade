"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { setMarketing, setService, fullUnsubscribe } from "./actions";

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? "bg-ink" : "bg-border"} ${disabled ? "opacity-50" : ""}`}
    >
      <span className={`inline-block size-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">{desc}</p>
      </div>
      <div className="pt-0.5">{children}</div>
    </div>
  );
}

export function EmailPreferencesClient({ initialMarketing, initialService }: { initialMarketing: boolean; initialService: boolean }) {
  const [marketing, setMarketingState] = React.useState(initialMarketing);
  const [service, setServiceState] = React.useState(initialService);
  const [busy, setBusy] = React.useState<string | null>(null);

  const toggleMarketing = async (v: boolean) => {
    setBusy("m"); setMarketingState(v);
    const r = await setMarketing(v); setBusy(null);
    if (r.error) { toast.error(r.error); setMarketingState(!v); return; }
    toast.success(v ? "Маркетинговые письма включены" : "Маркетинговые письма отключены");
  };
  const toggleService = async (v: boolean) => {
    setBusy("s"); setServiceState(v);
    const r = await setService(v); setBusy(null);
    if (r.error) { toast.error(r.error); setServiceState(!v); return; }
    toast.success(v ? "Сервисные напоминания включены" : "Сервисные напоминания отключены");
  };
  const unsubAll = async () => {
    setBusy("all");
    const r = await fullUnsubscribe(); setBusy(null);
    if (r.error) { toast.error(r.error); return; }
    setMarketingState(false); setServiceState(false);
    toast.success("Вы отписались от всех писем, кроме уведомлений по заказам");
  };

  return (
    <div className="mt-6 rounded-3xl border border-border/60 bg-white p-5 sm:p-7">
      <Row title="Заказы и доставка" desc="Подтверждения заказов, статусы, трек-номера. Отключить нельзя — это часть оказания услуги.">
        <Toggle checked disabled />
      </Row>
      <Row title="Сервисные напоминания" desc="Брошенная корзина, просьба об отзыве. Без рекламы.">
        {busy === "s" ? <Loader2 className="size-5 animate-spin text-ink-subtle" /> : <Toggle checked={service} onChange={toggleService} />}
      </Row>
      <Row title="Маркетинговые рассылки" desc="Акции, новинки, персональные предложения, подборки.">
        {busy === "m" ? <Loader2 className="size-5 animate-spin text-ink-subtle" /> : <Toggle checked={marketing} onChange={toggleMarketing} />}
      </Row>

      <div className="mt-5 border-t border-border/60 pt-5">
        <p className="text-[13px] text-ink-muted">Не хотите получать вообще ничего? Это отключит всё, кроме критических уведомлений по заказам (без них мы не сможем выполнить ваш заказ).</p>
        <button type="button" onClick={unsubAll} disabled={busy === "all"} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-[14px] font-medium text-ink hover:bg-surface disabled:opacity-60">
          {busy === "all" ? <Loader2 className="size-4 animate-spin" /> : null} Полная отписка
        </button>
      </div>
    </div>
  );
}
