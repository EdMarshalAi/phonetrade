"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, TextInput, Switch, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { saveIntegration, type IntegrationKey, type IntegrationRow } from "./actions";

/* ── Хелпер: одна секция интеграции ──────────────────────────────────── */
function IntegrationPanel({
  title,
  integrationKey,
  initial,
  children,
}: {
  title: string;
  integrationKey: IntegrationKey;
  initial: IntegrationRow | undefined;
  children: (
    cfg: Record<string, unknown>,
    setCfg: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  ) => React.ReactNode;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(initial?.is_enabled ?? false);
  const [cfg, setCfg] = React.useState<Record<string, unknown>>(initial?.config ?? {});
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await saveIntegration(integrationKey, cfg, enabled);
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    toast.success(`${title}: настройки сохранены`);
    router.refresh();
  };

  return (
    <Panel className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle>{title}</PanelTitle>
        <Switch checked={enabled} onChange={setEnabled} label="Включено" />
      </div>
      <FormError message={error} />
      {children(cfg, setCfg)}
      <AdminButton type="button" loading={saving} onClick={save}>Сохранить</AdminButton>
    </Panel>
  );
}

/* ── Главный компонент ────────────────────────────────────────────────── */
export function IntegrationsForm({ rows }: { rows: IntegrationRow[] }) {
  const map = Object.fromEntries(rows.map((r) => [r.key, r]));

  return (
    <div className="space-y-5">
      {/* Telegram */}
      <IntegrationPanel title="Telegram-бот" integrationKey="telegram" initial={map["telegram"]}>
        {(cfg, setCfg) => (
          <div className="space-y-4">
            <Field label="Bot Token" hint="Получите у @BotFather">
              <TextInput
                type="password"
                placeholder="1234567890:AAFabcdef…"
                value={String(cfg.bot_token ?? "")}
                onChange={(e) => setCfg((p) => ({ ...p, bot_token: e.target.value }))}
              />
            </Field>
            <Field label="Chat IDs" hint="Через запятую: ID чатов/каналов для уведомлений">
              <TextInput
                placeholder="-1001234567890, -1009876543210"
                value={String(cfg.chat_ids ?? "")}
                onChange={(e) => setCfg((p) => ({ ...p, chat_ids: e.target.value }))}
              />
            </Field>
          </div>
        )}
      </IntegrationPanel>

      {/* Яндекс.Метрика */}
      <IntegrationPanel title="Яндекс.Метрика" integrationKey="metrika" initial={map["metrika"]}>
        {(cfg, setCfg) => (
          <Field label="Номер счётчика">
            <TextInput
              placeholder="12345678"
              value={String(cfg.counter_id ?? "")}
              onChange={(e) => setCfg((p) => ({ ...p, counter_id: e.target.value }))}
            />
          </Field>
        )}
      </IntegrationPanel>

      {/* Google Analytics 4 */}
      <IntegrationPanel title="Google Analytics 4" integrationKey="ga4" initial={map["ga4"]}>
        {(cfg, setCfg) => (
          <Field label="Measurement ID" hint="Формат: G-XXXXXXXXXX">
            <TextInput
              placeholder="G-XXXXXXXXXX"
              value={String(cfg.measurement_id ?? "")}
              onChange={(e) => setCfg((p) => ({ ...p, measurement_id: e.target.value }))}
            />
          </Field>
        )}
      </IntegrationPanel>

      {/* Яндекс.Карты */}
      <IntegrationPanel title="Яндекс.Карты" integrationKey="yandex_maps" initial={map["yandex_maps"]}>
        {(cfg, setCfg) => (
          <Field label="API-ключ">
            <TextInput
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={String(cfg.api_key ?? "")}
              onChange={(e) => setCfg((p) => ({ ...p, api_key: e.target.value }))}
            />
          </Field>
        )}
      </IntegrationPanel>

      {/* ЮKassa */}
      <IntegrationPanel title="ЮKassa" integrationKey="yookassa" initial={map["yookassa"]}>
        {(cfg, setCfg) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="shopId">
              <TextInput
                placeholder="123456"
                value={String(cfg.shop_id ?? "")}
                onChange={(e) => setCfg((p) => ({ ...p, shop_id: e.target.value }))}
              />
            </Field>
            <Field label="Секретный ключ">
              <TextInput
                type="password"
                placeholder="live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={String(cfg.secret_key ?? "")}
                onChange={(e) => setCfg((p) => ({ ...p, secret_key: e.target.value }))}
              />
            </Field>
          </div>
        )}
      </IntegrationPanel>

      {/* Т-Банк */}
      <IntegrationPanel title="Т-Банк (эквайринг)" integrationKey="tbank" initial={map["tbank"]}>
        {(cfg, setCfg) => (
          <Field label="Merchant ID">
            <TextInput
              placeholder="TinkoffBankTest"
              value={String(cfg.merchant_id ?? "")}
              onChange={(e) => setCfg((p) => ({ ...p, merchant_id: e.target.value }))}
            />
          </Field>
        )}
      </IntegrationPanel>

      {/* SMTP */}
      <IntegrationPanel title="SMTP (почта)" integrationKey="smtp" initial={map["smtp"]}>
        {(cfg, setCfg) => (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Хост">
                <TextInput
                  placeholder="smtp.yandex.ru"
                  value={String(cfg.host ?? "")}
                  onChange={(e) => setCfg((p) => ({ ...p, host: e.target.value }))}
                />
              </Field>
              <Field label="Порт">
                <TextInput
                  placeholder="465"
                  value={String(cfg.port ?? "")}
                  onChange={(e) => setCfg((p) => ({ ...p, port: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Пользователь">
                <TextInput
                  placeholder="noreply@phonetrade.ru"
                  value={String(cfg.user ?? "")}
                  onChange={(e) => setCfg((p) => ({ ...p, user: e.target.value }))}
                />
              </Field>
              <Field label="Пароль">
                <TextInput
                  type="password"
                  value={String(cfg.pass ?? "")}
                  onChange={(e) => setCfg((p) => ({ ...p, pass: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Адрес отправителя (From)">
              <TextInput
                placeholder="PhoneTrade <noreply@phonetrade.ru>"
                value={String(cfg.from ?? "")}
                onChange={(e) => setCfg((p) => ({ ...p, from: e.target.value }))}
              />
            </Field>
          </div>
        )}
      </IntegrationPanel>
    </div>
  );
}
