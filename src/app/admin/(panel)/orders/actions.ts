"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";
import { notifyTelegram } from "@/lib/admin/telegram";
import { sendMail } from "@/lib/admin/mailer";
import { orderStatusEmail } from "@/lib/email/templates";
import { getOrderStatusConfig } from "@/lib/orders/status-config";

const STAFF = ["admin", "manager"] as const;

export async function setOrderStatus(
  id: string,
  toStatus: string,
  comment?: string
): Promise<{ error?: string }> {
  const db = createSupabaseAdminClient();
  const { data: order } = await db.from("orders").select("status,order_number,customer_id,customer_name,customer_email,phone,total").eq("id", id).maybeSingle();
  if (!order) return { error: "Заказ не найден" };

  // Менеджер может выставить ЛЮБОЙ статус из настроенного списка (без жёсткой
  // state-machine — иначе нельзя дойти до финального шага).
  const statuses = await getOrderStatusConfig();
  if (!statuses.some((s) => s.key === toStatus)) {
    return { error: "Неизвестный статус" };
  }
  if (toStatus === order.status) return {};

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

  // Аналитика промокода: статус применения по статусу заказа (для воронки).
  try {
    const useStatus = toStatus === "cancelled" ? "cancelled" : (toStatus === "new" || toStatus === "placed") ? "new" : "paid";
    await db.from("promo_code_usages").update({ order_status_at_use: useStatus }).eq("order_id", id);
  } catch (e) {
    console.error("[setOrderStatus] promo usage status:", e);
  }

  // Уведомление в Telegram при отмене (best-effort).
  if (toStatus === "cancelled") {
    const adminBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
    await notifyTelegram(
      "order_cancelled",
      `❌ <b>Заказ ${order.order_number ?? id} отменён</b>\n\n` +
        `👤 ${order.customer_name ?? "—"}\n` +
        `📞 ${order.phone ?? "—"}\n` +
        `💰 ${(order.total ?? 0).toLocaleString("ru-RU")} ₽\n` +
        `\n👉 <a href="${adminBase}/admin/orders/${id}">Открыть заказ в админке</a>`
    );
  }

  // Письмо покупателю о новом статусе (если есть email; best-effort).
  if (order.customer_email) {
    try {
      const st = statuses.find((s) => s.key === toStatus);
      const mail = orderStatusEmail({
        name: order.customer_name ?? "",
        orderNumber: order.order_number ?? id,
        statusLabel: st?.customerLabel || st?.label || toStatus,
        statusColor: st?.color,
      });
      await sendMail({ to: order.customer_email, subject: mail.subject, html: mail.html, text: mail.text });
    } catch (e) {
      console.error("[setOrderStatus] customer email:", e);
    }
  }

  // При доставке — отложенные триггеры: запрос отзыва (+7д) и cross-sell для
  // покупателей iPhone (+5д). Шлются при согласии на маркетинг (проверит очередь).
  if (toStatus === "delivered" && order.customer_email) {
    try {
      const { enqueueTrigger } = await import("@/lib/email/queue");
      const firstName = (order.customer_name ?? "").split(/\s+/)[0] || "";
      const vars = { customer: { first_name: firstName, name: order.customer_name ?? "" } };
      const now = Date.now();
      await enqueueTrigger({ triggerSlug: "review_request", customerId: order.customer_id ?? null, recipientEmail: order.customer_email, variables: vars, scheduledAt: new Date(now + 7 * 86400_000), dedupKey: `review:${id}` });
      // cross-sell только если в заказе есть iPhone (два простых запроса, без embed).
      const { data: items } = await db.from("order_items").select("product_id").eq("order_id", id);
      const ids = (items ?? []).map((i) => i.product_id).filter(Boolean) as string[];
      let hasIphone = false;
      if (ids.length) {
        const { data: prods } = await db.from("products").select("id").in("id", ids).like("category_slug", "iphone%").limit(1);
        hasIphone = (prods?.length ?? 0) > 0;
      }
      if (hasIphone) {
        await enqueueTrigger({ triggerSlug: "cross_sell_iphone", customerId: order.customer_id ?? null, recipientEmail: order.customer_email, variables: vars, scheduledAt: new Date(now + 5 * 86400_000), dedupKey: `crosssell:${id}` });
      }
    } catch (e) {
      console.error("[setOrderStatus] delivered triggers:", e);
    }
  }
  return {};
}

/** Полное удаление заказа: позиции, история, сам заказ + вычет из статистики
 * клиента. Из личного кабинета пропадает автоматически (ЛК читает заказы из БД). */
export async function deleteOrder(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "order",
      entityId: id,
      revalidate: ["/admin/orders", "/admin/customers", "/account/orders"],
      run: async (db) => {
        const { data: order } = await db.from("orders").select("customer_id,total").eq("id", id).maybeSingle();
        await db.from("order_items").delete().eq("order_id", id);
        await db.from("order_status_history").delete().eq("order_id", id);
        const { error } = await db.from("orders").delete().eq("id", id);
        if (error) throw error;
        // Вычитаем заказ из статистики клиента.
        if (order?.customer_id) {
          const { data: c } = await db.from("customers").select("total_orders,total_spent").eq("id", order.customer_id).maybeSingle();
          if (c) {
            await db
              .from("customers")
              .update({
                total_orders: Math.max(0, (c.total_orders ?? 0) - 1),
                total_spent: Math.max(0, (c.total_spent ?? 0) - (order.total ?? 0)),
              })
              .eq("id", order.customer_id);
          }
        }
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}

/* ── Manual order creation ──────────────────────────────────────────────── */

export interface ManualOrderItem {
  productId: string;
  title: string;
  qty: number;
  price: number;
}

export interface CreateManualOrderInput {
  customerType: "individual" | "legal";
  name: string;
  phone: string;
  email?: string;
  deliveryMethod: "pickup" | "courier";
  deliveryAddress?: string;
  paymentMethod: string;
  items: ManualOrderItem[];
}

export async function createManualOrder(
  input: CreateManualOrderInput
): Promise<{ error?: string }> {
  const admin = await getAdminUser();
  const db = createSupabaseAdminClient();

  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "order",
      revalidate: ["/admin/orders", "/account/orders"],
      run: async (d) => {
        // 1. Count existing orders for sequential number
        const { count } = await d
          .from("orders")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null);
        const seq = (count ?? 0) + 1;
        const year = new Date().getFullYear();
        const order_number = `PT-${year}-${String(seq).padStart(4, "0")}`;
        const id = crypto.randomUUID();

        // 2. Totals
        const subtotal = input.items.reduce((sum, it) => sum + it.price * it.qty, 0);
        const total = subtotal;

        // 3. Единый реестр «Клиенты» (та же RPC, что у витрины/заявок).
        const phoneDigits = input.phone.replace(/\D/g, "");
        let customer_id: string | null = null;
        try {
          const { data: cid } = await d.rpc("upsert_customer", {
            p_phone: input.phone,
            p_name: input.name,
            p_email: input.email || null,
            p_add_order_total: total,
          });
          customer_id = typeof cid === "string" ? cid : null;
        } catch {
          /* не критично */
        }

        // 4. Insert order
        const { error: orderError } = await d.from("orders").insert({
          id,
          order_number,
          customer_id,
          customer_name: input.name,
          phone: phoneDigits,
          customer_email: input.email || null,
          customer_type: input.customerType,
          delivery_method: input.deliveryMethod,
          delivery_address: input.deliveryAddress || null,
          payment_method: input.paymentMethod,
          payment_status: "pending",
          status: "new",
          subtotal,
          discount_cash: 0,
          discount_promo: 0,
          delivery_cost: 0,
          total,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (orderError) throw orderError;

        // 5. Insert order items
        if (input.items.length > 0) {
          const { error: itemsError } = await d.from("order_items").insert(
            input.items.map((it) => ({
              order_id: id,
              product_id: it.productId || null,
              title: it.title,
              qty: it.qty,
              applied_price: it.price,
              total: it.price * it.qty,
            }))
          );
          if (itemsError) throw itemsError;
        }

        // 6. Insert initial status history entry
        await d.from("order_status_history").insert({
          order_id: id,
          from_status: null,
          to_status: "new",
          changed_by: admin?.id ?? null,
          comment: "Создан вручную в админке",
        });
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка при создании заказа" };
  }

  redirect("/admin/orders");
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
