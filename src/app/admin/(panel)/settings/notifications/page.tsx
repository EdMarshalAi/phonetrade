import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { NotificationsForm } from "./NotificationsForm";

export const metadata: Metadata = { title: "Уведомления" };

export default async function NotificationsPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("notifications_config")
    .select("trigger, telegram_chat_ids, email_recipients, template, is_enabled");
  const rows = (data ?? []) as Array<{
    trigger: string;
    telegram_chat_ids: string[];
    email_recipients: string[];
    template: string;
    is_enabled: boolean;
  }>;

  return (
    <>
      <PageHeader
        title="Уведомления"
        description="Триггеры, каналы (Telegram, Email) и шаблоны сообщений."
      />
      <NotificationsForm rows={rows} />
    </>
  );
}
