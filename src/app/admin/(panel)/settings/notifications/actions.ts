"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { getAdminUser } from "@/lib/admin/auth";
import { sendTelegram } from "@/lib/admin/telegram";

export type NotificationTrigger =
  | "new_order"
  | "order_cancelled"
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
      changes: { is_enabled: config.is_enabled },
      run: async (db) => {
        const { error } = await db.from("notifications_config").upsert(
          {
            trigger,
            telegram_chat_ids: config.telegram_chat_ids,
            email_recipients: config.email_recipients,
            template: config.template,
            is_enabled: config.is_enabled,
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
