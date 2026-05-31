import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { NotificationsForm } from "./NotificationsForm";
import { getAdminEmails } from "./actions";

export const metadata: Metadata = { title: "Уведомления" };

export default async function NotificationsPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const [{ data }, { data: ints }, adminEmails] = await Promise.all([
    db.from("notifications_config").select("trigger, telegram_chat_ids, email_recipients, template, is_enabled, channels"),
    db.from("integrations").select("key, config, is_enabled").in("key", ["telegram", "smtp"]),
    getAdminEmails(),
  ]);
  const rows = (data ?? []) as Array<{
    trigger: string;
    telegram_chat_ids: string[];
    email_recipients: string[];
    template: string;
    is_enabled: boolean;
    channels: { telegram: boolean; email: boolean } | null;
  }>;
  const intMap = Object.fromEntries(((ints ?? []) as { key: string; config: Record<string, unknown>; is_enabled: boolean }[]).map((i) => [i.key, i]));
  const tg = intMap["telegram"];
  const smtp = intMap["smtp"];
  const channels = {
    telegramReady: !!(tg?.is_enabled && tg?.config?.bot_token && (Array.isArray(tg?.config?.chat_ids) ? (tg!.config!.chat_ids as unknown[]).length : 0) > 0),
    telegramConfigured: !!tg?.config?.bot_token,
    smtpReady: !!(smtp?.is_enabled && smtp?.config?.host),
  };

  return (
    <>
      <PageHeader
        title="Уведомления"
        description="Какие события и в какие каналы уведомлять. Каналы (Telegram-бот, почта) настраиваются в разделе «Интеграции»."
      />
      <NotificationsForm rows={rows} channels={channels} adminEmails={adminEmails} />
    </>
  );
}
