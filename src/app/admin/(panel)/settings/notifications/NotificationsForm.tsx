"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, Mail, Loader2, Check, AlertTriangle, ExternalLink, Plus, RefreshCw } from "lucide-react";
import { Switch, AdminButton } from "@/components/admin/form";
import { cn } from "@/lib/utils/cn";
import {
  saveNotification,
  sendTestTelegram,
  getNotificationLogs,
  type NotificationTrigger,
  type NotificationLog,
} from "./actions";

type Channels = { telegramReady: boolean; telegramConfigured: boolean; smtpReady: boolean };

const GROUPS: { title: string; items: { key: NotificationTrigger; label: string; desc: string }[] }[] = [
  { title: "Продажи", items: [
    { key: "new_order", label: "Новый заказ", desc: "Покупатель оформил заказ на сайте" },
    { key: "order_cancelled", label: "Отмена заказа", desc: "Заказ переведён в статус «Отменён»" },
  ] },
  { title: "Клиенты", items: [
    { key: "new_registration", label: "Регистрация пользователя", desc: "Новый покупатель зарегистрировался на сайте" },
  ] },
  { title: "Заявки", items: [
    { key: "new_lead_trade_in", label: "Заявка Trade-in", desc: "Отправлен квиз оценки устройства" },
    { key: "new_lead_repair", label: "Заявка на ремонт", desc: "Заявка со страницы «Ремонт техники»" },
    { key: "data_request_new", label: "Обращение по перс. данным", desc: "Запрос 152-ФЗ из личного кабинета" },
  ] },
  { title: "Прайс и курс", items: [
    { key: "pricing_recalc_done", label: "Пересчёт прайса", desc: "Завершён пересчёт цен" },
    { key: "pricing_below_margin", label: "Маржа ниже минимума", desc: "Есть товары с маржой ниже порога категории" },
    { key: "pricing_import_done", label: "Импорт прайса", desc: "Загружен прайс из файла" },
    { key: "cbr_rate_big_change", label: "Скачок курса ЦБ", desc: "Курс изменился на 2% и более за сутки" },
    { key: "cbr_rate_fetch_failed", label: "Сбой получения курса", desc: "Не удалось получить курс ЦБ" },
  ] },
];
const TRIGGER_LABEL: Record<string, string> = Object.fromEntries(GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label])));

type Row = {
  trigger: string;
  telegram_chat_ids?: string[];
  email_recipients?: string[];
  template?: string;
  is_enabled?: boolean;
  channels?: { telegram: boolean; email: boolean } | null;
};

export function NotificationsForm({ rows, channels, adminEmails }: { rows: Row[]; channels: Channels; adminEmails: string[] }) {
  const map = Object.fromEntries(rows.map((r) => [r.trigger, r]));
  const [tab, setTab] = React.useState<"settings" | "logs">("settings");

  return (
    <div className="space-y-5">
      <div role="tablist" className="flex gap-1 border-b border-border">
        {([["settings", "Настройки"], ["logs", "Логи отправок"]] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn("-mb-px h-10 border-b-2 px-4 text-[13.5px] font-medium transition-colors", tab === k ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "settings" ? (
        <div className="space-y-6">
          <ChannelsPanel channels={channels} />
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">{g.title}</h2>
              <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
                {g.items.map((it) => (
                  <TriggerRow key={it.key} trigger={it.key} label={it.label} desc={it.desc} initial={map[it.key]} adminEmails={adminEmails} smtpReady={channels.smtpReady} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <LogsTab />
      )}
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
      <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", channels.telegramReady ? "bg-ink text-white" : "bg-surface text-ink-muted")}><Send className="size-5" strokeWidth={1.75} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-ink">Telegram-бот</h3>
            <p className="mt-0.5 text-[12.5px]">
              {channels.telegramReady ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="size-3.5" /> Подключён</span>
                : channels.telegramConfigured ? <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="size-3.5" /> Токен есть, нет чатов</span>
                : <span className="inline-flex items-center gap-1 text-ink-muted"><AlertTriangle className="size-3.5" /> Не настроен</span>}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Link href="/admin/settings/integrations"><AdminButton type="button" variant="outline" size="sm"><ExternalLink className="size-4" /> Интеграции</AdminButton></Link>
          <AdminButton type="button" size="sm" onClick={test} disabled={testing}>{testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Тест</AdminButton>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_1px_3px_rgba(29,29,31,0.04)]">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", channels.smtpReady ? "bg-ink text-white" : "bg-surface text-ink-muted")}><Mail className="size-5" strokeWidth={1.75} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-ink">Почта (SMTP)</h3>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">{channels.smtpReady ? "SMTP настроен — письма отправляются" : "SMTP не настроен — письма не уйдут"}</p>
          </div>
        </div>
        <div className="mt-4"><Link href="/admin/settings/integrations"><AdminButton type="button" variant="outline" size="sm"><ExternalLink className="size-4" /> Настроить SMTP</AdminButton></Link></div>
      </div>
    </div>
  );
}

function TriggerRow({ trigger, label, desc, initial, adminEmails, smtpReady }: { trigger: NotificationTrigger; label: string; desc: string; initial?: Row; adminEmails: string[]; smtpReady: boolean }) {
  const router = useRouter();
  const [tg, setTg] = React.useState(initial?.channels?.telegram ?? true);
  const [email, setEmail] = React.useState(initial?.channels?.email ?? false);
  const [recipients, setRecipients] = React.useState<string[]>(initial?.email_recipients ?? []);
  const [custom, setCustom] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const persist = async (next: { tg: boolean; email: boolean; recipients: string[] }) => {
    setBusy(true);
    const res = await saveNotification(trigger, {
      telegram_chat_ids: initial?.telegram_chat_ids ?? [],
      email_recipients: next.recipients,
      template: initial?.template ?? "",
      is_enabled: next.tg || next.email,
      channels: { telegram: next.tg, email: next.email },
    });
    setBusy(false);
    if (res.error) { toast.error(res.error); return false; }
    router.refresh();
    return true;
  };

  const toggleTg = async (v: boolean) => { setTg(v); if (!(await persist({ tg: v, email, recipients }))) setTg(!v); };
  const toggleEmail = async (v: boolean) => { setEmail(v); if (!(await persist({ tg, email: v, recipients }))) setEmail(!v); };
  const toggleRecipient = async (e: string) => {
    const next = recipients.includes(e) ? recipients.filter((x) => x !== e) : [...recipients, e];
    setRecipients(next); await persist({ tg, email, recipients: next });
  };
  const addCustom = async () => {
    const e = custom.trim();
    if (!e || recipients.includes(e)) { setCustom(""); return; }
    const next = [...recipients, e]; setRecipients(next); setCustom(""); await persist({ tg, email, recipients: next });
  };

  const allEmails = [...new Set([...adminEmails, ...recipients])];

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{label}</p>
          <p className="text-[12.5px] text-ink-muted">{desc}</p>
        </div>
        {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-ink-subtle" /> : null}
        <div className="flex shrink-0 items-center gap-4">
          <label className="flex items-center gap-1.5 text-[12px] text-ink-muted"><Send className="size-3.5" /> <Switch checked={tg} onChange={toggleTg} /></label>
          <label className="flex items-center gap-1.5 text-[12px] text-ink-muted"><Mail className="size-3.5" /> <Switch checked={email} onChange={toggleEmail} /></label>
        </div>
      </div>

      {email ? (
        <div className="mt-3 rounded-xl bg-surface/40 p-3">
          {!smtpReady ? <p className="mb-2 text-[12px] text-amber-700">SMTP не настроен — письма не отправятся, пока не подключите его в Интеграциях.</p> : null}
          <p className="mb-1.5 text-[12px] font-medium text-ink-subtle">Кому на почту{recipients.length === 0 ? " (пусто = всем активным админам)" : ""}:</p>
          <div className="flex flex-wrap gap-1.5">
            {allEmails.map((e) => (
              <button key={e} type="button" onClick={() => toggleRecipient(e)}
                className={cn("rounded-full border px-2.5 py-1 text-[12px] transition-colors", recipients.includes(e) ? "border-ink bg-ink text-white" : "border-border bg-white text-ink-muted hover:border-ink/40")}>
                {recipients.includes(e) ? <Check className="mr-1 inline size-3" /> : null}{e}
              </button>
            ))}
            <span className="inline-flex items-center gap-1">
              <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                placeholder="добавить почту" className="h-7 w-40 rounded-full border border-border bg-white px-3 text-[12px] focus:border-ink focus:outline-none" />
              <button type="button" onClick={addCustom} className="rounded-full p-1 text-ink-muted hover:text-ink"><Plus className="size-4" /></button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LogsTab() {
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<NotificationLog[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async (p: number) => {
    setLoading(true);
    const res = await getNotificationLogs(p);
    setLoading(false);
    if (res.error) { toast.error(res.error); return; }
    setRows(res.rows); setTotal(res.total); setPage(p);
  }, []);

  React.useEffect(() => { load(1); }, [load]);

  const pages = Math.max(1, Math.ceil(total / 25));
  const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-muted">Последние отправки уведомлений · всего {total}</p>
        <AdminButton type="button" variant="outline" size="sm" onClick={() => load(page)} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Обновить
        </AdminButton>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
        {rows === null ? (
          <div className="p-6 text-center text-sm text-ink-muted">Загрузка…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-muted">Отправок пока нет.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="border-b border-border/60 bg-surface/60 text-left text-[11px] uppercase tracking-wide text-ink-subtle">
              <tr><th className="px-4 py-2">Дата</th><th className="px-4 py-2">Событие</th><th className="px-4 py-2">Канал</th><th className="px-4 py-2">Получатель</th><th className="px-4 py-2">Статус</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-ink-muted">{fmt(r.created_at)}</td>
                  <td className="px-4 py-2">{TRIGGER_LABEL[r.trigger] ?? r.trigger}</td>
                  <td className="px-4 py-2 text-ink-muted">{r.channel === "telegram" ? "Telegram" : "Email"}</td>
                  <td className="max-w-[220px] truncate px-4 py-2 text-ink-muted" title={r.recipient ?? ""}>{r.recipient ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", r.status === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-sale/10 text-sale")} title={r.detail ?? ""}>
                      {r.status === "sent" ? "Доставлено" : "Ошибка"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pages > 1 ? (
        <div className="flex items-center justify-center gap-3 text-[13px]">
          <button type="button" disabled={page <= 1 || loading} onClick={() => load(page - 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Назад</button>
          <span className="text-ink-muted">{page} / {pages}</span>
          <button type="button" disabled={page >= pages || loading} onClick={() => load(page + 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Вперёд</button>
        </div>
      ) : null}
    </div>
  );
}
