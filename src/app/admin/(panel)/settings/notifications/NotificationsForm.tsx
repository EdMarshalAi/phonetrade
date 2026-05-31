"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Mail, Loader2, Check, AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import { Field, TextInput, Textarea, Switch, AdminButton } from "@/components/admin/form";
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

const csvToArr = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const arrToCsv = (a: string[]) => a.join(", ");

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
  // Нет строки в БД = по умолчанию включено (срабатывает в дефолтные чаты).
  const [enabled, setEnabled] = React.useState(initial ? initial.is_enabled : true);
  const [open, setOpen] = React.useState(false);
  const [chatIds, setChatIds] = React.useState(arrToCsv(initial?.telegram_chat_ids ?? []));
  const [emails, setEmails] = React.useState(arrToCsv(initial?.email_recipients ?? []));
  const [template, setTemplate] = React.useState(initial?.template ?? "");
  const [busy, setBusy] = React.useState(false);

  const persist = async (next: { enabled?: boolean } = {}) => {
    const en = next.enabled ?? enabled;
    setBusy(true);
    const res = await saveNotification(trigger, {
      telegram_chat_ids: csvToArr(chatIds),
      email_recipients: csvToArr(emails),
      template,
      is_enabled: en,
    });
    setBusy(false);
    if (res.error) { toast.error(res.error); return false; }
    router.refresh();
    return true;
  };

  const onToggle = async (v: boolean) => {
    setEnabled(v);
    const ok = await persist({ enabled: v });
    if (ok) toast.success(v ? "Включено" : "Выключено");
    else setEnabled(!v);
  };

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{label}</span>
            <ChevronDown className={cn("size-4 text-ink-subtle transition-transform", open && "rotate-180")} />
          </div>
          <p className="truncate text-[12.5px] text-ink-muted">{desc}</p>
        </button>
        {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-ink-subtle" /> : <Switch checked={enabled} onChange={onToggle} />}
      </div>

      {open ? (
        <div className="mt-3 space-y-3 rounded-xl bg-surface/40 p-4">
          <Field label="Telegram Chat IDs (необязательно)" hint="Через запятую. Пусто = чаты по умолчанию из Интеграций.">
            <TextInput placeholder="-1001234567890" value={chatIds} onChange={(e) => setChatIds(e.target.value)} />
          </Field>
          <Field label="Email-получатели (необязательно)" hint="Через запятую.">
            <TextInput placeholder="manager@phonetrade.ru" value={emails} onChange={(e) => setEmails(e.target.value)} />
          </Field>
          <Field label="Шаблон сообщения (необязательно)">
            <Textarea rows={3} value={template} onChange={(e) => setTemplate(e.target.value)} />
          </Field>
          <AdminButton type="button" size="sm" loading={busy} onClick={async () => { if (await persist()) toast.success("Сохранено"); }}>Сохранить</AdminButton>
        </div>
      ) : null}
    </div>
  );
}
