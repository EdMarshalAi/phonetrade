"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendTelegram, telegramRecipientsFor } from "@/lib/admin/telegram";

export type PlaceOrderInput = {
  items: {
    productId: string;
    title: string;
    image?: string;
    qty: number;
    priceCash: number;
    priceCard: number;
  }[];
  customerType: "individual" | "legal";
  name: string;
  phone: string;
  email?: string;
  deliveryMethod: string;
  deliveryAddress?: string;
  paymentMethod: string;
  promoCode?: string;
  subtotal: number;
  discountCash: number;
  total: number;
};

export type PlaceOrderResult = {
  ok?: boolean;
  orderNumber?: string;
  error?: string;
};

/** Нормализует телефон до цифр (для ключа клиента). */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const db = createSupabaseAdminClient();

  try {
    const year = new Date().getFullYear();
    const orderId = crypto.randomUUID();

    // Определяем порядковый номер заказа в этом году.
    let seq = 1;
    try {
      const { count } = await db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${year}-01-01T00:00:00Z`);
      seq = (count ?? 0) + 1;
    } catch {
      // fallback — случайный 4-значный суффикс
      seq = Math.floor(1000 + Math.random() * 9000);
    }
    const orderNumber = `PT-${year}-${String(seq).padStart(4, "0")}`;

    // Upsert клиента по нормализованному телефону.
    const phoneDigits = normalizePhone(input.phone);
    let customerId: string | null = null;
    try {
      const { data: existing } = await db
        .from("customers")
        .select("id, total_orders, total_spent")
        .eq("phone", phoneDigits)
        .maybeSingle();

      if (existing) {
        await db
          .from("customers")
          .update({
            name: input.name,
            email: input.email ?? null,
            total_orders: (existing.total_orders ?? 0) + 1,
            total_spent: (existing.total_spent ?? 0) + input.total,
            last_order_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        customerId = existing.id;
      } else {
        const newCustomerId = crypto.randomUUID();
        await db.from("customers").insert({
          id: newCustomerId,
          phone: phoneDigits,
          name: input.name,
          email: input.email ?? null,
          total_orders: 1,
          total_spent: input.total,
          segment: "new",
          first_order_at: new Date().toISOString(),
          last_order_at: new Date().toISOString(),
        });
        customerId = newCustomerId;
      }
    } catch {
      // Не критично — продолжаем без customer_id
    }

    // Вставляем заказ.
    const { error: orderError } = await db.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_type: input.customerType,
      customer_name: input.name,
      customer_phone: phoneDigits,
      customer_email: input.email ?? null,
      phone: phoneDigits,
      delivery_method: input.deliveryMethod,
      delivery_address: input.deliveryAddress ?? null,
      delivery_cost: input.deliveryMethod === "courier" ? 0 : 0,
      payment_method: input.paymentMethod,
      payment_status: "pending",
      status: "new",
      subtotal: input.subtotal,
      discount_cash: input.discountCash,
      discount_promo: 0,
      total: input.total,
      promo_code: input.promoCode ?? null,
      created_at: new Date().toISOString(),
    });

    if (orderError) {
      console.error("[placeOrder] insert order error:", orderError);
      return { error: "Не удалось создать заказ. Попробуйте ещё раз." };
    }

    // Вставляем строки заказа.
    const isCash = input.paymentMethod === "cash" || input.paymentMethod === "sbp";
    const orderItems = input.items.map((item) => {
      const appliedPrice = isCash ? item.priceCash : item.priceCard;
      return {
        order_id: orderId,
        product_id: item.productId,
        variant_id: null,
        title: item.title,
        sku: null,
        image: item.image ?? null,
        qty: item.qty,
        price_cash: item.priceCash,
        price_card: item.priceCard,
        applied_price: appliedPrice,
        total: appliedPrice * item.qty,
      };
    });

    const { error: itemsError } = await db.from("order_items").insert(orderItems);
    if (itemsError) {
      console.error("[placeOrder] insert order_items error:", itemsError);
      // Заказ уже создан — не возвращаем ошибку, только логируем
    }

    // Вставляем запись в историю статусов.
    try {
      await db.from("order_status_history").insert({
        order_id: orderId,
        from_status: null,
        to_status: "new",
        changed_by: null,
        comment: "Заказ оформлен на сайте",
      });
    } catch {
      // Не критично
    }

    // Уведомление в Telegram (best-effort, не блокирует ответ).
    try {
      const chats = await telegramRecipientsFor("new_order");
      const deliveryLabel = input.deliveryMethod === "courier" ? "Курьер" : "Самовывоз";
      await sendTelegram(
        `🛒 Новый заказ <b>${orderNumber}</b>\n` +
          `Клиент: ${input.name}, ${input.phone}\n` +
          `Сумма: ${input.total.toLocaleString("ru-RU")} ₽\n` +
          `Оплата: ${input.paymentMethod}, ${deliveryLabel}`,
        chats.length ? chats : undefined
      );
    } catch {
      // Не критично
    }

    return { ok: true, orderNumber };
  } catch (err) {
    console.error("[placeOrder] unexpected error:", err);
    return { error: "Произошла ошибка при оформлении заказа. Попробуйте ещё раз." };
  }
}
