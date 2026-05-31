"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, TextInput, Textarea, Switch, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import {
  saveNotification,
  type NotificationTrigger,
  type NotificationConfig,
} from "./actions";

const TRIGGER_LABELS: Record<NotificationTrigger, string> = {
  new_order: "Новый заказ",
  new_lead: "Новая заявка",
  low_stock: "Низкий остаток",
  order_paid: "Заказ оплачен",
  order_cancelled: "Отмена заказа",
  data_request_new: "Обращение по персональным данным",
  new_lead_trade_in: "Новая заявка Trade-in",
};

const TRIGGERS: NotificationTrigger[] = [
  "new_order",
  "new_lead",
  "low_stock",
  "order_paid",
  "order_cancelled",
  "data_request_new",
  "new_lead_trade_in",
];

function csvToArray(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToCsv(arr: string[]): string {
  return arr.join(", ");
}

function NotificationPanel({
  trigger,
  initial,
}: {
  trigger: NotificationTrigger;
  initial: NotificationConfig | undefined;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState(initial?.is_enabled ?? false);
  const [chatIds, setChatIds] = React.useState(arrayToCsv(initial?.telegram_chat_ids ?? []));
  const [emails, setEmails] = React.useState(arrayToCsv(initial?.email_recipients ?? []));
  const [template, setTemplate] = React.useState(initial?.template ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await saveNotification(trigger, {
      telegram_chat_ids: csvToArray(chatIds),
      email_recipients: csvToArray(emails),
      template,
      is_enabled: enabled,
    });
    setSaving(false);
    if (res?.error) { setError(res.error); return; }
    toast.success(`«${TRIGGER_LABELS[trigger]}»: настройки сохранены`);
    router.refresh();
  };

  return (
    <Panel className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle>{TRIGGER_LABELS[trigger]}</PanelTitle>
        <Switch checked={enabled} onChange={setEnabled} label="Включено" />
      </div>
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Telegram Chat IDs"
          hint="Через запятую. Используйте ID из настроек бота."
        >
          <TextInput
            placeholder="-1001234567890, -1009876543210"
            value={chatIds}
            onChange={(e) => setChatIds(e.target.value)}
          />
        </Field>
        <Field
          label="Email-получатели"
          hint="Через запятую."
        >
          <TextInput
            placeholder="manager@phonetrade.ru, owner@phonetrade.ru"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Шаблон сообщения" hint="Переменные: {{name}}, {{phone}}, {{order_id}}, {{total}}">
        <Textarea
          placeholder="Новый заказ #{{order_id}} на {{total}} ₽\nКлиент: {{name}} {{phone}}"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
        />
      </Field>
      <AdminButton type="button" loading={saving} onClick={save}>Сохранить</AdminButton>
    </Panel>
  );
}

export function NotificationsForm({
  rows,
}: {
  rows: Array<{ trigger: string } & NotificationConfig>;
}) {
  const map = Object.fromEntries(rows.map((r) => [r.trigger, r as NotificationConfig]));

  return (
    <div className="space-y-5">
      {TRIGGERS.map((trigger) => (
        <NotificationPanel
          key={trigger}
          trigger={trigger}
          initial={map[trigger]}
        />
      ))}
    </div>
  );
}
