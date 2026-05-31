"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Mail, Loader2, Check, AlertTriangle, ExternalLink } from "lucide-react";
import { Switch, AdminButton } from "@/components/admin/form";
import { cn } from "@/lib/utils/cn";
import { saveNotification, sendTestTelegram, type NotificationTrigger, type NotificationConfig } from "./actions";

type Channels = { telegramReady: boolean; telegramConfigured: boolean; smtpReady: boolean };

const GROUPS: { title: string; items: { key: NotificationTrigger; label: string; desc: string }[] }[] = [
  { title: "Продажи", items: [
    { key: "new_order", label: "Новый заказ", desc: "Покупатель оформил заказ на сайте" },
    { key: "order_cancelled", label: "Отмена заказа", desc: "Заказ переведён в статус «Отменён»" },
  ] },
  { title: "Заявки", items: [
    { key: "new_lead_trade_in", label: "Заявка Trade-in", desc: "Отправлен квиз оценки устройства" },
    { key: "data_request_new", label: "Обращение по перс. данным", desc: "Запрос 152-ФЗ из личного кабинета" },
  ] },
  { title: "Прайс и курс", items: [
    { key: "pricing_recalc_done", label: "Пересчёт прайса", desc: "Завершён пересчёт цен" },
    { key: "pricing_below_margin", label: "Маржа ниже минимума", desc: "Есть товары с маржой ниже порога категории" },
    { key: "pricing_import_done", label: "Импорт прайса", desc: "Загружен прайс из файла" },
    { key: "cbr_rate_big_change", label: "Скачок курса ЦБ", desc: "Курс изменился более чем на 5% за сутки" },
    { key: "cbr_rate_fetch_failed", label: "Сбой получения курса", desc: "Не удалось получить курс ЦБ" },
  ] },
];

export function NotificationsForm({ rows, channels }: { rows: Array<{ trigger: string } & NotificationConfig>; channels: Channels }) {
  const map = Object.fromEntries(rows.map((r) => [r.trigger, r]));
  return (
    <div className="space-y-6">
      <ChannelsPanel channels={channels} />
      {GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">{g.title}</h2>
          <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
            {g.items.map((it) => (
              <TriggerRow key={it.key} trigger={it.key} label={it.label} desc={it.desc} initial={map[it.key] as NotificationConfig | undefined} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ChannelsPanel({ channels }: { channels: Channels }) {
  const [testing, setTesting] = React.useState(false);
  const test = async () => {
    setTesting(true);
    const res = await sendTestTelegram();
    setTesting(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(`Тест отправлен в Telegram (${res.ok} чат(ов))`);
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Telegram */}
      <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", channels.telegramReady ? "bg-ink text-white" : "bg-surface text-ink-muted")}>
            <Send className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-ink">Telegram-бот</h3>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[12.5px]">
              {channels.telegramReady ? (
                <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="size-3.5" /> Подключён — уведомления идут</span>
              ) : channels.telegramConfigured ? (
                <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="size-3.5" /> Токен есть, но нет Chat IDs или выключен</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-ink-muted"><AlertTriangle className="size-3.5" /> Не настроен</span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Link href="/admin/settings/integrations"><AdminButton type="button" variant="outline" size="sm"><ExternalLink className="size-4" /> Настроить в Интеграциях</AdminButton></Link>
          <AdminButton type="button" size="sm" onClick={test} disabled={testing}>
            {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Отправить тест
          </AdminButton>
        </div>
      </div>

      {/* Email */}
      <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", channels.smtpReady ? "bg-ink text-white" : "bg-surface text-ink-muted")}>
            <Mail className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-ink">Почта (SMTP)</h3>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              {channels.smtpReady ? "SMTP настроен" : "SMTP не настроен"} · отправка писем подключается отдельно
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/admin/settings/integrations"><AdminButton type="button" variant="outline" size="sm"><ExternalLink className="size-4" /> Настроить в Интеграциях</AdminButton></Link>
        </div>
      </div>
    </div>
  );
}

function TriggerRow({ trigger, label, desc, initial }: { trigger: NotificationTrigger; label: string; desc: string; initial?: NotificationConfig }) {
  const router = useRouter();
  // Нет строки в БД = по умолчанию включено (срабатывает в чаты из Интеграций).
  const [enabled, setEnabled] = React.useState(initial ? initial.is_enabled : true);
  const [busy, setBusy] = React.useState(false);

  const onToggle = async (v: boolean) => {
    setEnabled(v);
    setBusy(true);
    const res = await saveNotification(trigger, {
      telegram_chat_ids: initial?.telegram_chat_ids ?? [],
      email_recipients: initial?.email_recipients ?? [],
      template: initial?.template ?? "",
      is_enabled: v,
    });
    setBusy(false);
    if (res.error) { toast.error(res.error); setEnabled(!v); return; }
    toast.success(v ? "Включено" : "Выключено");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">{label}</p>
        <p className="text-[12.5px] text-ink-muted">{desc}</p>
      </div>
      {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-ink-subtle" /> : <Switch checked={enabled} onChange={onToggle} />}
    </div>
  );
}
