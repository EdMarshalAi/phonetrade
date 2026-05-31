"use server";

import { adminMutation } from "@/lib/admin/mutations";

export type NotificationTrigger =
  | "new_order"
  | "new_lead"
  | "low_stock"
  | "order_paid"
  | "order_cancelled"
  | "data_request_new";

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
      changes: config,
      revalidate: ["/"],
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
