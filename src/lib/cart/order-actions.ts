"use server";

import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyTelegram } from "@/lib/admin/telegram";
import { sendMail } from "@/lib/admin/mailer";
import { orderConfirmationEmail } from "@/lib/email/templates";
import { clientIp, rateLimited } from "@/lib/utils/rate-limit";
import { normalizePhone as normalizeRuPhone } from "@/lib/validation/phone";
import { cookies } from "next/headers";
import { cancelQueuedByDedupPrefix } from "@/lib/email/queue";
import { normalizeCartSettings } from "@/lib/content";
import type { CartItem } from "@/lib/cart/types";
import { calculateCartTotals } from "@/lib/cart/totals";
import { validatePromoCode } from "@/lib/cart/promo-actions";
import type { ValidatedPromo } from "@/lib/cart/promo";
import { MAX_ORDER_LINES, MAX_QTY } from "@/lib/cart/constants";
import type { CategorySlug, Product } from "@/lib/data/products";
import { resolveProductAvailability } from "@/lib/product-commerce";
import { after } from "next/server";

const CONSENT_VERSION = "2026-01-15-v1";

export type PlaceOrderInput = {
  /** Стабильный UUID одной попытки checkout — повтор после потери ответа не дублирует заказ. */
  attemptId: string;
  items: {
    productId: string;
    qty: number;
  }[];
  customerType: "individual" | "legal";
  name: string;
  phone: string;
  email?: string;
  deliveryMethod: string;
  deliveryAddress?: string;
  paymentMethod: string;
  promoCode?: string;
  expectedTotal: number;
  deliveryTime?: string;
  comment?: string;
  companyName?: string;
  companyInn?: string;
  consentOferta?: boolean;
  consentPd?: boolean;
  consentMarketing?: boolean;
};

export type PlaceOrderResult = {
  ok?: boolean;
  orderNumber?: string;
  total?: number;
  error?: string;
  priceChanged?: boolean;
  refreshRequired?: boolean;
  promoInvalidated?: boolean;
  confirmedItems?: { id: string; name: string; price: number; quantity: number }[];
};

type CheckoutProductRow = {
  id: string;
  title: string;
  category_slug: string;
  image: string | null;
  price_cash: number;
  price_card: number;
  stock: number | null;
  in_stock: boolean;
  is_available: boolean | null;
  sku: string | null;
};

const CHECKOUT_PRODUCT_SELECT = "id,title,category_slug,image,price_cash,price_card,stock,in_stock,is_available,sku";

function checkoutProduct(row: CheckoutProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    categorySlug: row.category_slug as CategorySlug,
    model: "",
    color: "",
    image: row.image ?? "",
    priceCash: Number(row.price_cash) || 0,
    priceCard: Number(row.price_card) || 0,
    stock: row.stock ?? undefined,
    inStock: row.stock == null ? row.in_stock !== false : row.stock > 0,
    isAvailable: row.is_available ?? true,
    sku: row.sku ?? undefined,
  };
}

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

  // Телефон РФ: нормализуем и отклоняем мусор/городские/иностранные.
  const ruPhone = normalizeRuPhone(input.phone);
  if (!ruPhone) return { error: "Укажите корректный мобильный номер РФ: +7 (9XX) XXX-XX-XX" };
  const orderId = input.attemptId?.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(orderId)) {
    return { error: "Не удалось создать безопасный идентификатор заказа. Обновите страницу." };
  }

  // Сначала восстанавливаем уже зафиксированный заказ. Это важно, если ответ
  // первого вызова потерялся, а к повтору товар успел подорожать, закончиться
  // или скрыться: такие изменения не должны заставлять покупателя создать дубль.
  const { data: existingAttempt, error: existingAttemptError } = await db
    .from("orders")
    .select("order_number,total,phone")
    .eq("id", orderId)
    .maybeSingle();
  if (existingAttemptError) {
    console.error("[placeOrder] idempotency lookup:", existingAttemptError);
    return { error: "Не удалось проверить статус заказа. Попробуйте ещё раз." };
  }
  if (existingAttempt) {
    if (existingAttempt.phone !== ruPhone) {
      return { error: "Не удалось проверить безопасный идентификатор заказа. Обновите страницу." };
    }
    const { data: existingItems, error: existingItemsError } = await db
      .from("order_items")
      .select("product_id,title,applied_price,qty")
      .eq("order_id", orderId);
    if (existingItemsError) {
      console.error("[placeOrder] idempotency items lookup:", existingItemsError);
    }
    return {
      ok: true,
      orderNumber: existingAttempt.order_number ?? orderId,
      total: Number(existingAttempt.total) || 0,
      confirmedItems: existingItemsError
        ? undefined
        : (existingItems ?? []).map((item) => ({
            id: item.product_id,
            name: item.title,
            price: Number(item.applied_price) || 0,
            quantity: Number(item.qty) || 1,
          })),
    };
  }

  // Антиспам относится только к созданию нового заказа; безопасный replay выше
  // должен работать и после нескольких сетевых повторов.
  if (rateLimited(`order:${await clientIp()}`, 10, 600_000)) {
    return { error: "Слишком много заказов подряд. Попробуйте через несколько минут." };
  }

  const customerName = input.name?.trim().slice(0, 120);
  if (!customerName) return { error: "Укажите, как к вам обращаться" };
  const customerEmail = input.email?.trim().slice(0, 254) || null;
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { error: "Проверьте формат e-mail" };
  }

  try {
    // Браузер передаёт только идентификатор и количество. Названия, цены,
    // наличие, способы оплаты/доставки и промокод повторно проверяем на сервере.
    if (!Array.isArray(input.items) || input.items.length > MAX_ORDER_LINES) {
      return { error: `В одном заказе может быть не больше ${MAX_ORDER_LINES} позиций` };
    }
    const requested = new Map<string, number>();
    for (const item of input.items) {
      const id = item.productId?.trim();
      const qty = Math.max(1, Math.min(MAX_QTY, Math.round(Number(item.qty)) || 1));
      if (id) requested.set(id, Math.min(MAX_QTY, (requested.get(id) ?? 0) + qty));
    }
    if (requested.size === 0) return { error: "Корзина пуста" };
    if (requested.size > MAX_ORDER_LINES) {
      return { error: `В одном заказе может быть не больше ${MAX_ORDER_LINES} позиций` };
    }

    const ids = [...requested.keys()];
    const priorOrdersQuery = input.promoCode?.trim()
      ? db.from("orders").select("id", { count: "exact", head: true }).eq("phone", ruPhone).neq("status", "cancelled")
      : Promise.resolve({ count: 0, error: null });
    const [
      { data: productRows, error: productsError },
      { data: availabilityRow, error: availabilityError },
      { data: cartSettingsRow, error: cartSettingsError },
      { data: existingCustomer, error: customerLookupError },
      { count: priorOrderCount, error: priorOrdersError },
    ] = await Promise.all([
      db
        .from("products")
        .select(CHECKOUT_PRODUCT_SELECT)
        .in("id", ids)
        .eq("status", "published")
        .is("deleted_at", null),
      db.from("shop_settings").select("value").eq("key", "product_availability").maybeSingle(),
      db.from("shop_settings").select("value").eq("key", "cart").maybeSingle(),
      db.from("customers").select("id,total_orders").like("phone", `%${ruPhone.slice(-10)}`).limit(1).maybeSingle(),
      priorOrdersQuery,
    ]);
    if (productsError) throw productsError;
    if (availabilityError || !availabilityRow) {
      console.error("[placeOrder] product availability settings:", availabilityError);
      return { error: "Не удалось проверить наличие товаров. Попробуйте ещё раз." };
    }
    if (cartSettingsError || !cartSettingsRow) {
      console.error("[placeOrder] cart settings:", cartSettingsError);
      return { error: "Не удалось проверить способы оплаты и доставки. Попробуйте ещё раз." };
    }
    if (!productRows || productRows.length !== ids.length) {
      return { error: "Один из товаров больше недоступен. Обновите корзину.", refreshRequired: true };
    }

    const settings = normalizeCartSettings(cartSettingsRow.value);
    const allowZeroStock = ((availabilityRow.value ?? {}) as { allow_zero_stock?: boolean }).allow_zero_stock !== false;
    const productsById = new Map(
      (productRows as CheckoutProductRow[]).map((row) => [row.id, checkoutProduct(row)])
    );
    const authoritativeItems: CartItem[] = [];
    for (const [productId, qty] of requested) {
      const product = productsById.get(productId);
      if (!product || product.isAvailable === false) {
        return { error: "Один из товаров больше недоступен. Обновите корзину.", refreshRequired: true };
      }
      const availability = resolveProductAvailability(product, allowZeroStock);
      const exceedsKnownStock = product.stock != null && product.stock < qty;
      if (!availability.canOrder || (!allowZeroStock && exceedsKnownStock)) {
        return {
          error: `Товар «${product.title}» закончился. Измените состав заказа.`,
          refreshRequired: true,
        };
      }
      authoritativeItems.push({ productId, product, qty });
    }

    const payment = settings.payments.find((method) => method.enabled && method.key === input.paymentMethod);
    if (!payment) return { error: "Выбранный способ оплаты недоступен", refreshRequired: true };
    const delivery = settings.delivery.find((method) => method.enabled && method.key === input.deliveryMethod);
    if (!delivery) return { error: "Выбранный способ доставки недоступен", refreshRequired: true };
    if (delivery.requiresAddress && !input.deliveryAddress?.trim()) {
      return { error: "Укажите адрес доставки", refreshRequired: true };
    }

    let promo: ValidatedPromo | null = null;
    if (input.promoCode?.trim()) {
      if (customerLookupError || priorOrdersError) {
        return { error: "Не удалось проверить ограничения промокода. Попробуйте ещё раз." };
      }
      const promoResult = await validatePromoCode(input.promoCode, {
        customerId: existingCustomer?.id ?? null,
        email: customerEmail,
        hasPriorOrders: (priorOrderCount ?? existingCustomer?.total_orders ?? 0) > 0,
      });
      if (promoResult.error || !promoResult.promo) {
        return {
          error: promoResult.error ?? "Промокод больше недоступен",
          promoInvalidated: true,
        };
      }
      promo = promoResult.promo;
    }
    const totals = calculateCartTotals({ items: authoritativeItems, payment, delivery, promo });
    const expectedTotal = Math.round(Number(input.expectedTotal));
    if (!Number.isFinite(expectedTotal) || expectedTotal < 0) {
      return { error: "Не удалось проверить итог заказа. Обновите страницу." };
    }
    if (expectedTotal !== totals.total) {
      return {
        error: `Цена или условия доставки изменились. Новая сумма — ${totals.total.toLocaleString("ru-RU")} ₽. Проверьте обновлённую корзину и подтвердите заказ ещё раз.`,
        priceChanged: true,
        total: totals.total,
      };
    }

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

    const phoneDigits = normalizePhone(input.phone);
    let customerId: string | null = existingCustomer?.id ?? null;
    const deliveryAddress = input.deliveryAddress?.trim().slice(0, 500) || null;
    const deliveryTimeLabels: Record<string, string> = {
      any: "Любое время",
      morning: "10:00–13:00",
      day: "13:00–17:00",
      evening: "17:00–20:00",
    };
    const orderNotes = [
      input.deliveryTime && deliveryTimeLabels[input.deliveryTime]
        ? `Желаемое время: ${deliveryTimeLabels[input.deliveryTime]}`
        : null,
      input.comment?.trim() ? `Комментарий покупателя: ${input.comment.trim().slice(0, 1000)}` : null,
      input.customerType === "legal" && input.companyName?.trim()
        ? `Компания: ${input.companyName.trim().slice(0, 200)}`
        : null,
      input.customerType === "legal" && input.companyInn?.trim()
        ? `ИНН: ${input.companyInn.replace(/\D/g, "").slice(0, 12)}`
        : null,
    ].filter(Boolean).join("\n") || null;

    // Заголовок, строки и резерв промокода записываются одной RPC-транзакцией.
    // Номер заказа генерируется там же под advisory-lock.
    const orderItems = authoritativeItems.map(({ productId, qty }) => {
      return {
        product_id: productId,
        qty,
      };
    });
    const promoHadEffect = totals.promoDiscount > 0 || totals.freeShippingApplied;
    const rpcResult = await db.rpc(
      "create_storefront_order",
      {
        p_order: {
          id: orderId,
          customer_id: customerId,
          user_id: userId,
          customer_type: input.customerType,
          customer_name: customerName,
          customer_email: customerEmail,
          phone: ruPhone,
          delivery_method: input.deliveryMethod,
          delivery_address: deliveryAddress,
          delivery_cost: totals.delivery,
          payment_method: input.paymentMethod,
          price_base: totals.base,
          subtotal: totals.subtotal,
          discount_cash: totals.discountCash,
          discount_promo: totals.promoDiscount,
          surcharge: totals.surcharge,
          total: totals.total,
          promo_code: promo?.code ?? null,
          manager_notes: orderNotes,
        },
        p_items: orderItems,
        p_promo_code: promo?.code ?? null,
        p_promo_had_effect: promoHadEffect,
      }
    );
    let transactionResult = rpcResult.data;
    let transactionError = rpcResult.error;
    if (transactionError) {
      // Сеть могла оборваться уже после COMMIT. Проверяем тот же attempt UUID:
      // найденный заказ считаем успешным replay и не предлагаем создать дубль.
      const { data: recoveredOrder } = await db
        .from("orders")
        .select("order_number,total,customer_id,phone")
        .eq("id", orderId)
        .maybeSingle();
      if (recoveredOrder?.phone === ruPhone) {
        transactionResult = {
          order_id: orderId,
          order_number: recoveredOrder.order_number ?? orderId,
          total: recoveredOrder.total,
          customer_id: recoveredOrder.customer_id,
          replayed: true,
        };
        transactionError = null;
      }
    }
    if (transactionError) {
      const code = transactionError.message;
      console.error("[placeOrder] transaction:", transactionError);
      if (code.includes("PROMO_TOTAL_LIMIT")) {
        return { error: "Лимит промокода только что был исчерпан.", promoInvalidated: true };
      }
      if (code.includes("PROMO_CUSTOMER_LIMIT")) {
        return {
          error: "Лимит использований промокода для этого покупателя исчерпан.",
          promoInvalidated: true,
        };
      }
      if (code.includes("PROMO_ONLY_NEW")) {
        return { error: "Промокод действует только для первого заказа.", promoInvalidated: true };
      }
      if (
        code.includes("PROMO_INVALID") ||
        code.includes("PROMO_NOT_STARTED") ||
        code.includes("PROMO_EXPIRED")
      ) {
        return { error: "Промокод больше недоступен.", promoInvalidated: true };
      }
      if (code.includes("PROMO_CHANGED")) {
        return {
          error: "Условия промокода изменились. Примените его ещё раз.",
          priceChanged: true,
          promoInvalidated: true,
          total: totals.total,
        };
      }
      if (code.includes("PRICE_CHANGED")) {
        return {
          error: "Цена товара изменилась. Проверьте обновлённую корзину и подтвердите заказ ещё раз.",
          priceChanged: true,
          refreshRequired: true,
        };
      }
      if (code.includes("STOCK_CHANGED") || code.includes("PRODUCT_UNAVAILABLE")) {
        return {
          error: "Остаток одного из товаров изменился. Проверьте обновлённую корзину.",
          refreshRequired: true,
        };
      }
      if (code.includes("AVAILABILITY_SETTINGS_UNAVAILABLE")) {
        return { error: "Не удалось проверить наличие товаров. Попробуйте ещё раз." };
      }
      return { error: "Не удалось создать заказ. Попробуйте ещё раз." };
    }

    const transactionRecord =
      transactionResult && typeof transactionResult === "object" && !Array.isArray(transactionResult)
        ? transactionResult as Record<string, unknown>
        : null;
    const returnedOrderNumber =
      transactionRecord && typeof transactionRecord.order_number === "string"
        ? transactionRecord.order_number
        : null;
    if (!returnedOrderNumber) {
      console.error("[placeOrder] transaction returned no order_number:", transactionResult);
    }
    // RPC уже зафиксировала заказ: даже при неожиданном ответе нельзя предлагать
    // повторную отправку и создавать дубль. UUID остаётся безопасным fallback.
    const orderNumber = returnedOrderNumber ?? orderId;
    const replayed = transactionRecord?.replayed === true;
    const confirmedTotal = typeof transactionRecord?.total === "number"
      ? transactionRecord.total
      : totals.total;
    if (typeof transactionRecord?.customer_id === "string") {
      customerId = transactionRecord.customer_id;
    }

    // 152-ФЗ: фиксируем согласия в реестре с метаданными (IP/UA/страница/действие).
    try {
      const h = await headers();
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
      const ua = h.get("user-agent") || null;
      const baseConsent = {
        user_email: customerEmail,
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

    // Telegram/SMTP не удерживают ответ checkout. На idempotent replay повторно
    // не отправляем уведомления; первый вызов уже поставил этот after-callback.
    if (!replayed) after(async () => {
      try {
        const deliveryLabel = delivery.label;
        const adminBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
        const lines = authoritativeItems
          .map(({ product, qty }) => {
            const price = totals.base === "cash" ? product.priceCash : product.priceCard;
            return `• ${product.title} ×${qty} — ${(price * qty).toLocaleString("ru-RU")} ₽`;
          })
          .join("\n");
        await notifyTelegram(
          "new_order",
          `🛒 <b>Новый заказ ${orderNumber}</b>\n\n` +
            `👤 ${customerName}${input.customerType === "legal" ? " (юр. лицо)" : ""}\n` +
            `📞 ${input.phone}\n` +
            (customerEmail ? `✉️ ${customerEmail}\n` : "") +
            `\n🛍 Состав:\n${lines}\n\n` +
            (totals.discountCash ? `Скидка за наличные: −${totals.discountCash.toLocaleString("ru-RU")} ₽\n` : "") +
            (totals.delivery ? `Доставка: ${totals.delivery.toLocaleString("ru-RU")} ₽\n` : "") +
            (totals.promoDiscount ? `Промокод ${promo?.code ?? ""}: −${totals.promoDiscount.toLocaleString("ru-RU")} ₽\n` : "") +
            `💰 <b>Итого: ${totals.total.toLocaleString("ru-RU")} ₽</b>\n` +
            `💳 ${payment.label} · ${deliveryLabel}\n` +
            (deliveryAddress ? `📍 ${deliveryAddress}\n` : "") +
            (orderNotes ? `📝 ${orderNotes.replace(/\n/g, " · ")}\n` : "") +
            `\n👉 <a href="${adminBase}/admin/orders/${orderId}">Открыть заказ в админке</a>`
        );
      } catch (e) {
        console.error("[placeOrder] telegram notification:", e);
      }

      if (customerEmail) {
        try {
          const mail = orderConfirmationEmail({
            name: customerName,
            orderNumber,
            items: authoritativeItems.map(({ product, qty }) => ({
              title: product.title,
              qty,
              price: totals.base === "cash" ? product.priceCash : product.priceCard,
            })),
            total: totals.total,
            paymentLabel: payment.label,
            deliveryLabel: delivery.label,
            address: deliveryAddress || undefined,
          });
          await sendMail({ to: customerEmail, subject: mail.subject, html: mail.html, text: mail.text });
        } catch (e) {
          console.error("[placeOrder] customer email:", e);
        }
      }
    });

    // Корзина оформлена: помечаем, очищаем и снимаем письма брошенной корзины.
    try {
      const cartId = (await cookies()).get("pt_cart")?.value;
      if (cartId) {
        await db.from("carts").update({ status: "ordered" }).eq("id", cartId);
        await db.from("cart_items").delete().eq("cart_id", cartId);
        await cancelQueuedByDedupPrefix(`cart:${cartId}:`);
      }
    } catch (e) {
      console.error("[placeOrder] cart cleanup:", e);
    }

    return {
      ok: true,
      orderNumber,
      total: confirmedTotal,
      confirmedItems: authoritativeItems.map(({ product, qty }) => ({
        id: product.id,
        name: product.title,
        price: totals.base === "cash" ? product.priceCash : product.priceCard,
        quantity: qty,
      })),
    };
  } catch (err) {
    console.error("[placeOrder] unexpected error:", err);
    return { error: "Произошла ошибка при оформлении заказа. Попробуйте ещё раз." };
  }
}
