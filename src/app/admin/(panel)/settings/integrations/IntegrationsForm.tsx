"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, Send, Mail, Code2, Plus, Loader2, Trash2, X, Sparkles, ShieldCheck } from "lucide-react";
import { Field, TextInput, Textarea, Switch, Select, AdminButton } from "@/components/admin/form";
import { cn } from "@/lib/utils/cn";
import { saveIntegration, createCustomIntegration, deleteIntegration, sendTestEmail, type IntegrationRow } from "./actions";

type FieldDef = { name: string; label: string; type?: string; placeholder?: string; hint?: string; multiline?: boolean; rows?: number };
type Builtin = { key: string; title: string; desc: string; icon: typeof BarChart3; fields: FieldDef[] };

const BUILTIN: Builtin[] = [
  { key: "metrika", title: "Яндекс.Метрика", desc: "Веб-аналитика, вебвизор, цели и e-commerce", icon: BarChart3,
    fields: [{ name: "counter_id", label: "Номер счётчика", placeholder: "91129028", hint: "По умолчанию грузится при согласии на cookie-аналитику (см. тумблер ниже)" }] },
  { key: "telegram", title: "Telegram-бот", desc: "Уведомления о заказах и заявках", icon: Send,
    fields: [
      { name: "bot_token", label: "Bot Token", type: "password", placeholder: "1234567890:AA…", hint: "Получите у @BotFather" },
      { name: "chat_ids", label: "Chat IDs", placeholder: "-1001234567890, -1009876543210", hint: "Через запятую" },
    ] },
  { key: "smtp", title: "SMTP (почта)", desc: "Отправка писем покупателям", icon: Mail,
    fields: [
      { name: "host", label: "Хост", placeholder: "smtp.yandex.ru" },
      { name: "port", label: "Порт", placeholder: "465" },
      { name: "user", label: "Пользователь", placeholder: "noreply@phonetrade.ru" },
      { name: "pass", label: "Пароль", type: "password" },
      { name: "from", label: "Адрес отправителя (From)", placeholder: "PhoneTrade <noreply@phonetrade.ru>" },
    ] },
  { key: "webmaster", title: "Верификация в вебмастерах", desc: "Подтверждение прав: метатеги Яндекс и Bing", icon: ShieldCheck,
    fields: [
      { name: "yandex", label: "Яндекс.Вебмастер", placeholder: "ec396f42004ecb9a", hint: "Код из <meta name=\"yandex-verification\" content=\"…\">. Webmaster.yandex.ru → добавить сайт → метатег." },
      { name: "bing", label: "Bing Webmaster", placeholder: "1CBE9EB073CB5A735F19C97915CEA8B2", hint: "Код из <meta name=\"msvalidate.01\" content=\"…\">. Нужен для попадания в ChatGPT/SearchGPT." },
    ] },
  { key: "openai", title: "ChatGPT (OpenAI)", desc: "Генерация описаний и мета-тегов товара по кнопке", icon: Sparkles,
    fields: [
      { name: "api_key", label: "API-ключ", type: "password", placeholder: "sk-…", hint: "platform.openai.com → API keys" },
      { name: "model", label: "Модель", placeholder: "gpt-4o-mini", hint: "напр. gpt-4o-mini (дёшево) или gpt-4o" },
      { name: "prompt_short", label: "Промт: краткое описание", multiline: true, rows: 4, hint: "Доступна переменная {{title}}. JSON-формат и запрет цены добавляются автоматически." },
      { name: "prompt_full", label: "Промт: подробное описание", multiline: true, rows: 5, hint: "Доступна переменная {{title}}. Просите чистый HTML." },
      { name: "prompt_meta", label: "Промт: мета-теги", multiline: true, rows: 4, hint: "Доступна переменная {{title}}. Title ≤60, description ≤160." },
    ] },
];

type Entry = { config: Record<string, unknown>; is_enabled: boolean };

export function IntegrationsForm({ rows }: { rows: IntegrationRow[] }) {
  const router = useRouter();
  const [data, setData] = React.useState<Record<string, Entry>>(() => {
    const map: Record<string, Entry> = {};
    for (const b of BUILTIN) map[b.key] = { config: {}, is_enabled: false };
    for (const r of rows) map[r.key] = { config: r.config ?? {}, is_enabled: r.is_enabled };
    return map;
  });
  const [open, setOpen] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const customKeys = Object.keys(data).filter((k) => k.startsWith("custom_") && data[k].config?.type === "code");
  const allKeys = [...BUILTIN.map((b) => b.key), ...customKeys];

  const toggle = async (key: string, next: boolean) => {
    setData((d) => ({ ...d, [key]: { ...d[key], is_enabled: next } }));
    setBusy(key);
    const res = await saveIntegration(key, data[key]?.config ?? {}, next);
    setBusy(null);
    if (res.error) { toast.error(res.error); setData((d) => ({ ...d, [key]: { ...d[key], is_enabled: !next } })); return; }
    toast.success(next ? "Включено" : "Выключено");
    router.refresh();
  };

  const removeCustom = async (key: string) => {
    if (!window.confirm("Удалить интеграцию?")) return;
    const res = await deleteIntegration(key);
    if (res.error) { toast.error(res.error); return; }
    setData((d) => { const c = { ...d }; delete c[key]; return c; });
    toast.success("Удалено");
    router.refresh();
  };

  const meta = (key: string) => {
    const b = BUILTIN.find((x) => x.key === key);
    if (b) return { title: b.title, desc: b.desc, icon: b.icon };
    return { title: String(data[key]?.config?.title || "Код-интеграция"), desc: "Произвольный код (счётчик/пиксель/виджет)", icon: Code2 };
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {allKeys.map((key) => {
          const m = meta(key);
          const e = data[key];
          const Icon = m.icon;
          const on = !!e?.is_enabled;
          return (
            <div key={key} className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_1px_3px_rgba(29,29,31,0.04)] transition-colors hover:border-ink/20">
              <div className="flex items-start gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", on ? "bg-ink text-white" : "bg-surface text-ink-muted")}>
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-[15px] font-semibold text-ink">{m.title}</h3>
                    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", on ? "bg-emerald-50 text-emerald-700" : "bg-surface text-ink-subtle")}>
                      {on ? "Подключено" : "Выключено"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{m.desc}</p>
                </div>
                {busy === key ? <Loader2 className="size-4 shrink-0 animate-spin text-ink-subtle" /> : <Switch checked={on} onChange={(v) => toggle(key, v)} />}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <AdminButton type="button" variant="outline" size="sm" onClick={() => setOpen(key)}>Настроить</AdminButton>
                {key.startsWith("custom_") ? (
                  <button type="button" onClick={() => removeCustom(key)} className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-ink-subtle/60 transition-colors hover:bg-sale/5 hover:text-sale" aria-label="Удалить">
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/30 p-5 text-ink-muted transition-colors hover:border-ink/30 hover:bg-surface/60 hover:text-ink"
        >
          <Plus className="size-6" />
          <span className="text-[14px] font-medium">Добавить интеграцию</span>
          <span className="text-[12px] text-ink-subtle">Вставить код счётчика / пикселя / виджета</span>
        </button>
      </div>

      {open ? (
        <SettingsModal
          intKey={open}
          builtin={BUILTIN.find((b) => b.key === open)}
          entry={data[open]}
          onClose={() => setOpen(null)}
          onSaved={(cfg, en) => { setData((d) => ({ ...d, [open]: { config: cfg, is_enabled: en } })); setOpen(null); router.refresh(); }}
          onDeleted={() => { setData((d) => { const c = { ...d }; delete c[open]; return c; }); setOpen(null); router.refresh(); }}
        />
      ) : null}

      {addOpen ? (
        <AddModal
          onClose={() => setAddOpen(false)}
          onCreated={(key, cfg) => { setData((d) => ({ ...d, [key]: { config: cfg, is_enabled: true } })); setAddOpen(false); router.refresh(); }}
        />
      ) : null}
    </>
  );
}

function SettingsModal({ intKey, builtin, entry, onClose, onSaved, onDeleted }: {
  intKey: string;
  builtin?: Builtin;
  entry: Entry;
  onClose: () => void;
  onSaved: (cfg: Record<string, unknown>, enabled: boolean) => void;
  onDeleted: () => void;
}) {
  const isCustom = intKey.startsWith("custom_");
  const [cfg, setCfg] = React.useState<Record<string, unknown>>(entry?.config ?? {});
  const [enabled, setEnabled] = React.useState(!!entry?.is_enabled);
  const [saving, setSaving] = React.useState(false);
  const title = builtin?.title ?? String(cfg.title || "Код-интеграция");

  const save = async () => {
    setSaving(true);
    const res = await saveIntegration(intKey, cfg, enabled);
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Сохранено");
    onSaved(cfg, enabled);
  };
  const remove = async () => {
    if (!window.confirm("Удалить интеграцию?")) return;
    const res = await deleteIntegration(intKey);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Удалено");
    onDeleted();
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <Switch checked={enabled} onChange={setEnabled} label="Включено" />
        {builtin ? (
          builtin.fields.map((f) => (
            <Field key={f.name} label={f.label} hint={f.hint}>
              {f.multiline ? (
                <Textarea
                  rows={f.rows ?? 4}
                  placeholder={f.placeholder}
                  value={String(cfg[f.name] ?? "")}
                  onChange={(e) => setCfg((p) => ({ ...p, [f.name]: e.target.value }))}
                />
              ) : (
                <TextInput
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  value={String(cfg[f.name] ?? "")}
                  onChange={(e) => setCfg((p) => ({ ...p, [f.name]: e.target.value }))}
                />
              )}
            </Field>
          ))
        ) : (
          <>
            <Field label="Название">
              <TextInput value={String(cfg.title ?? "")} onChange={(e) => setCfg((p) => ({ ...p, title: e.target.value }))} />
            </Field>
            <Field label="Код" hint="HTML/JS — счётчик, пиксель или виджет">
              <Textarea rows={8} className="font-mono text-[12px]" value={String(cfg.code ?? "")} onChange={(e) => setCfg((p) => ({ ...p, code: e.target.value }))} />
            </Field>
            <Field label="Куда вставлять">
              <Select value={String(cfg.placement ?? "body_end")} onChange={(e) => setCfg((p) => ({ ...p, placement: e.target.value }))}>
                <option value="head">В &lt;head&gt;</option>
                <option value="body_end">Перед &lt;/body&gt;</option>
              </Select>
            </Field>
          </>
        )}
        {intKey === "metrika" ? (
          <div className="rounded-xl border border-border/60 px-4 py-3">
            <Switch
              checked={cfg.collect_without_consent === true}
              onChange={(v) => setCfg((p) => ({ ...p, collect_without_consent: v }))}
              label="Собирать без подтверждения cookie"
            />
            <p className="mt-1.5 text-[12px] leading-snug text-ink-subtle">
              По умолчанию (выкл) Метрика грузится только после согласия посетителя на
              cookie-аналитику. Включите, чтобы счётчик собирал данные сразу, не дожидаясь
              согласия. Учитывайте требования 152-ФЗ — ответственность за такой сбор на владельце.
            </p>
          </div>
        ) : null}
        {intKey === "smtp" ? <TestEmailBlock cfg={cfg} /> : null}
        <div className="flex items-center gap-2 pt-1">
          <AdminButton type="button" onClick={save} loading={saving}>Сохранить</AdminButton>
          {isCustom ? <AdminButton type="button" variant="ghost" onClick={remove}><Trash2 className="size-4" /> Удалить</AdminButton> : null}
        </div>
      </div>
    </Modal>
  );
}

function TestEmailBlock({ cfg }: { cfg: Record<string, unknown> }) {
  const [to, setTo] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const send = async () => {
    const email = to.trim();
    if (!email) return;
    setSending(true);
    const res = await sendTestEmail(email, cfg);
    setSending(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Письмо отправлено — проверьте ящик (и папку «Спам»)");
  };
  return (
    <div className="rounded-xl border border-border/60 bg-surface/40 p-3">
      <p className="text-[13px] font-medium text-ink">Тестовое письмо</p>
      <p className="mb-2 text-[12px] text-ink-subtle">
        Отправит проверочное письмо текущими настройками — можно до сохранения.
      </p>
      <div className="flex items-center gap-2">
        <TextInput
          type="email"
          placeholder="куда отправить, напр. you@mail.ru"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <AdminButton type="button" variant="outline" onClick={send} loading={sending} disabled={!to.trim()}>
          Отправить
        </AdminButton>
      </div>
    </div>
  );
}

function AddModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string, cfg: Record<string, unknown>) => void }) {
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [placement, setPlacement] = React.useState<"head" | "body_end">("body_end");
  const [saving, setSaving] = React.useState(false);

  const create = async () => {
    setSaving(true);
    const res = await createCustomIntegration({ title, code, placement });
    setSaving(false);
    if (res.error || !res.key) { toast.error(res.error ?? "Ошибка"); return; }
    toast.success("Интеграция добавлена");
    onCreated(res.key, { type: "code", title, code, placement });
  };

  return (
    <Modal title="Новая интеграция (код)" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Название" hint="Напр. «Пиксель VK» или «Чат Jivo»">
          <TextInput value={title} placeholder="Пиксель VK" onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Код" hint="Вставьте код счётчика / пикселя / виджета (HTML+JS)">
          <Textarea rows={9} className="font-mono text-[12px]" placeholder="<script> … </script>" value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        <Field label="Куда вставлять">
          <Select value={placement} onChange={(e) => setPlacement(e.target.value as "head" | "body_end")}>
            <option value="head">В &lt;head&gt;</option>
            <option value="body_end">Перед &lt;/body&gt;</option>
          </Select>
        </Field>
        <div className="pt-1">
          <AdminButton type="button" onClick={create} loading={saving}><Plus className="size-4" /> Добавить</AdminButton>
        </div>
        <p className="text-[12px] text-ink-subtle">Код выполняется на витрине при согласии посетителя на cookie-аналитику.</p>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/70 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-subtle hover:bg-surface hover:text-ink" aria-label="Закрыть"><X className="size-4" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
