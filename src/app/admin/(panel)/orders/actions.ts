"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";
import { sendTelegram, telegramRecipientsFor } from "@/lib/admin/telegram";
import { ORDER_STATUS, ORDER_TRANSITIONS } from "./labels";

const STAFF = ["admin", "manager"] as const;

export async function setOrderStatus(
  id: string,
  toStatus: string,
  comment?: string
): Promise<{ error?: string }> {
  const db = createSupabaseAdminClient();
  const { data: order } = await db.from("orders").select("status,order_number").eq("id", id).maybeSingle();
  if (!order) return { error: "Заказ не найден" };

  const allowed = ORDER_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(toStatus)) {
    return { error: `Недопустимый переход: ${ORDER_STATUS[order.status] ?? order.status} → ${ORDER_STATUS[toStatus] ?? toStatus}` };
  }

  const admin = await getAdminUser();
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "status_change",
      entityType: "order",
      entityId: id,
      changes: { from: order.status, to: toStatus, comment },
      revalidate: ["/account/orders"],
      run: async (d) => {
        const { error } = await d
          .from("orders")
          .update({ status: toStatus, updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
        await d.from("order_status_history").insert({
          order_id: id,
          from_status: order.status,
          to_status: toStatus,
          changed_by: admin?.id ?? null,
          comment: comment || null,
        });
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }

  // Уведомление в Telegram при отмене (best-effort).
  if (toStatus === "cancelled") {
    const chats = await telegramRecipientsFor("order_cancelled");
    await sendTelegram(`❌ Заказ <b>${order.order_number ?? id}</b> отменён.`, chats.length ? chats : undefined);
  }
  return {};
}

export async function updateOrderNotes(id: string, notes: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "order",
      entityId: id,
      run: async (db) => {
        const { error } = await db.from("orders").update({ manager_notes: notes || null, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}
