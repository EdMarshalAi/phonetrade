"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { getAdminUser } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTelegram } from "@/lib/admin/telegram";

export type NotificationTrigger =
  | "new_order"
  | "order_cancelled"
  | "new_registration"
  | "new_lead_trade_in"
  | "data_request_new"
  | "pricing_recalc_done"
  | "pricing_below_margin"
  | "pricing_import_done"
  | "cbr_rate_big_change"
  | "cbr_rate_fetch_failed";

export interface NotificationConfig {
  telegram_chat_ids: string[];
  email_recipients: string[];
  template: string;
  is_enabled: boolean;
  channels: { telegram: boolean; email: boolean };
}

export async function saveNotification(
  trigger: NotificationTrigger,
  config: NotificationConfig
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: ["admin"],
      action: "update",
      entityType: "notifications_config",
      entityId: trigger,
      changes: { channels: config.channels, is_enabled: config.is_enabled },
      run: async (db) => {
        const { error } = await db.from("notifications_config").upsert(
          {
            trigger,
            telegram_chat_ids: config.telegram_chat_ids,
            email_recipients: config.email_recipients,
            template: config.template,
            is_enabled: config.is_enabled,
            channels: config.channels,
          },
          { onConflict: "trigger" }
        );
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}

export interface NotificationLog {
  id: number;
  trigger: string;
  channel: string;
  recipient: string | null;
  status: string;
  detail: string | null;
  created_at: string;
}

/** Логи отправок (пагинация) — по запросу, чтобы не грузить страницу. */
export async function getNotificationLogs(page = 1): Promise<{ rows: NotificationLog[]; total: number; error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { rows: [], total: 0, error: "Нет доступа" };
  try {
    const db = createSupabaseAdminClient();
    const size = 25;
    const from = (Math.max(1, page) - 1) * size;
    const { data, count } = await db
      .from("notification_logs")
      .select("id,trigger,channel,recipient,status,detail,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + size - 1);
    return { rows: (data ?? []) as NotificationLog[], total: count ?? 0 };
  } catch (e) {
    return { rows: [], total: 0, error: e instanceof Error ? e.message : "Ошибка" };
  }
}

/** Email активных админов — для выбора получателей. */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db.from("admin_users").select("email").eq("is_active", true);
    return ((data ?? []) as { email: string | null }[]).map((a) => a.email).filter((e): e is string => !!e);
  } catch {
    return [];
  }
}

/** Тестовое сообщение в Telegram (по дефолтным чатам интеграции). Проверка связки. */
export async function sendTestTelegram(): Promise<{ ok?: number; error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { error: "Нет доступа" };
  const n = await sendTelegram(
    "✅ <b>Тест уведомлений PhoneTrade</b>\nЕсли вы видите это сообщение — Telegram-бот подключён корректно."
  );
  if (n === 0) {
    return { error: "Не доставлено. Проверьте в «Интеграции → Telegram»: интеграция включена, указаны Bot Token и Chat IDs." };
  }
  return { ok: n };
}
