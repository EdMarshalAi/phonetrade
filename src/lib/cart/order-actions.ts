"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyTelegram } from "@/lib/admin/telegram";
import { sendMail } from "@/lib/admin/mailer";
import { orderConfirmationEmail } from "@/lib/email/templates";
import { clientIp, rateLimited } from "@/lib/utils/rate-limit";

const CONSENT_VERSION = "2026-01-15-v1";

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
  promoDiscount?: number;
  consentOferta?: boolean;
  consentPd?: boolean;
  consentMarketing?: boolean;
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

  // 152-ФЗ: без согласия на оферту/политику и на обработку ПД заказ не оформляется.
  if (!input.consentOferta || !input.consentPd) {
    return { error: "Необходимо принять оферту и согласие на обработку персональных данных" };
  }

  // Антиспам: не более 10 заказов с одного IP за 10 минут.
  if (rateLimited(`order:${await clientIp()}`, 10, 600_000)) {
    return { error: "Слишком много заказов подряд. Попробуйте через несколько минут." };
  }

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

    // Текущий пользователь (если оформляет авторизованный) — для связи заказа и
    // клиента с личным кабинетом.
    let userId: string | null = null;
    try {
      const supa = await createSupabaseServerClient();
      const { data: au } = await supa.auth.getUser();
      userId = au.user?.id ?? null;
    } catch {
      /* гость */
    }

    // Единый реестр «Клиенты»: апсерт по телефону (последние 10 цифр) + сумма
    // заказа в статистику. Та же функция, что у заявок/регистрации.
    const phoneDigits = normalizePhone(input.phone);
    let customerId: string | null = null;
    try {
      const { data: cid } = await db.rpc("upsert_customer", {
        p_phone: input.phone,
        p_name: input.name,
        p_email: input.email ?? null,
        p_user_id: userId,
        p_add_order_total: input.total,
      });
      customerId = typeof cid === "string" ? cid : null;
    } catch {
      // Не критично — продолжаем без customer_id
    }

    // Вставляем заказ.
    const { error: orderError } = await db.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId,
      user_id: userId,
      customer_type: input.customerType,
      customer_name: input.name,
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
      discount_promo: input.promoDiscount ?? 0,
      total: input.total,
      promo_code: input.promoCode ?? null,
      created_at: new Date().toISOString(),
    });

    if (orderError) {
      console.error("[placeOrder] insert order error:", orderError);
      return { error: "Не удалось создать заказ. Попробуйте ещё раз." };
    }

    // Счётчик использований промокода (best-effort).
    if (input.promoCode) {
      try {
        const { data: pc } = await db.from("promo_codes").select("used_count").eq("code", input.promoCode).maybeSingle();
        if (pc) await db.from("promo_codes").update({ used_count: (pc.used_count ?? 0) + 1 }).eq("code", input.promoCode);
      } catch {
        /* ignore */
      }
    }

    // 152-ФЗ: фиксируем согласия в реестре с метаданными (IP/UA/страница/действие).
    try {
      const h = await headers();
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
      const ua = h.get("user-agent") || null;
      const baseConsent = {
        user_email: input.email ?? null,
        user_phone: phoneDigits || null,
        customer_id: customerId,
        consent_version: CONSENT_VERSION,
        ip_address: ip,
        user_agent: ua,
        source_page: "/cart",
        source_action: "checkout",
        given_at: new Date().toISOString(),
      };
      const consentRows = [
        {
          ...baseConsent,
          consent_type: "offer_acceptance",
          consent_purpose: "Принятие публичной оферты и политики конфиденциальности",
          document_url: "/offer",
        },
        {
          ...baseConsent,
          consent_type: "pd_processing",
          consent_purpose: "Обработка персональных данных для оформления и исполнения заказа",
          document_url: "/consent",
        },
        ...(input.consentMarketing
          ? [
              {
                ...baseConsent,
                consent_type: "marketing",
                consent_purpose: "Получение рекламных и информационных рассылок",
                document_url: "/consent",
              },
            ]
          : []),
      ];
      await db.from("data_consents").insert(consentRows);
    } catch (e) {
      // Не критично для оформления — только логируем.
      console.error("[placeOrder] record consents error:", e);
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
      const PAY: Record<string, string> = { sbp: "СБП", card: "Карта", on_delivery: "При получении", cash: "Наличные", installment: "Рассрочка", credit: "Кредит" };
      const deliveryLabel = input.deliveryMethod === "courier" ? "Курьер по Белгороду" : "Самовывоз (ул. Попова, 36)";
      const adminBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
      const lines = input.items.map((i) => `• ${i.title} ×${i.qty} — ${(i.priceCash * i.qty).toLocaleString("ru-RU")} ₽`).join("\n");
      await notifyTelegram(
        "new_order",
        `🛒 <b>Новый заказ ${orderNumber}</b>\n\n` +
          `👤 ${input.name}${input.customerType === "legal" ? " (юр. лицо)" : ""}\n` +
          `📞 ${input.phone}\n` +
          (input.email ? `✉️ ${input.email}\n` : "") +
          `\n🛍 Состав:\n${lines}\n\n` +
          (input.discountCash ? `Скидка за наличные: −${input.discountCash.toLocaleString("ru-RU")} ₽\n` : "") +
          (input.promoDiscount ? `Промокод ${input.promoCode ?? ""}: −${input.promoDiscount.toLocaleString("ru-RU")} ₽\n` : "") +
          `💰 <b>Итого: ${input.total.toLocaleString("ru-RU")} ₽</b>\n` +
          `💳 ${PAY[input.paymentMethod] ?? input.paymentMethod} · ${deliveryLabel}\n` +
          (input.deliveryAddress ? `📍 ${input.deliveryAddress}\n` : "") +
          `\n👉 <a href="${adminBase}/admin/orders/${orderId}">Открыть заказ в админке</a>`
      );
    } catch {
      // Не критично
    }

    // Письмо-подтверждение покупателю (если оставил email; best-effort).
    if (input.email?.trim()) {
      try {
        const PAY: Record<string, string> = { sbp: "СБП", card: "Карта", on_delivery: "При получении", cash: "Наличные", installment: "Рассрочка", credit: "Кредит" };
        const deliveryLabel = input.deliveryMethod === "courier" ? "Курьер по Белгороду" : "Самовывоз (ул. Попова, 36)";
        const mail = orderConfirmationEmail({
          name: input.name,
          orderNumber,
          items: input.items.map((i) => ({ title: i.title, qty: i.qty, price: i.priceCash })),
          total: input.total,
          paymentLabel: PAY[input.paymentMethod] ?? input.paymentMethod,
          deliveryLabel,
          address: input.deliveryAddress || undefined,
        });
        await sendMail({ to: input.email.trim(), subject: mail.subject, html: mail.html, text: mail.text });
      } catch (e) {
        console.error("[placeOrder] customer email:", e);
      }
    }

    return { ok: true, orderNumber };
  } catch (err) {
    console.error("[placeOrder] unexpected error:", err);
    return { error: "Произошла ошибка при оформлении заказа. Попробуйте ещё раз." };
  }
}
