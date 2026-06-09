"use client";

import * as React from "react";
import { Check, ChevronLeft, RotateCcw } from "lucide-react";
import { SectionStep } from "@/components/cart/SectionStep";
import { CartItemsSection } from "@/components/cart/CartItemsSection";
import { CustomerSection } from "@/components/cart/CustomerSection";
import { DeliverySection } from "@/components/cart/DeliverySection";
import { PaymentSection } from "@/components/cart/PaymentSection";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { validateCheckout } from "@/lib/cart/validate";
import { MAX_QTY } from "@/lib/cart/constants";
import { pluralizeItems } from "@/lib/utils/plural";
import type { CartItem, CheckoutState } from "@/lib/cart/types";
import { placeOrder } from "@/lib/cart/order-actions";
import { ymReachGoal, ymPurchase } from "@/lib/analytics/metrika";
import { validatePromoCode } from "@/lib/cart/promo-actions";
import { computePromoDiscount, type ValidatedPromo } from "@/lib/cart/promo";
import { trackFunnel } from "@/lib/analytics/track";
import { useCart } from "@/components/providers/CartProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import type { CartSettings, InfoBlock } from "@/lib/content";

export function CartShell({
  settings,
  checkoutBlocks,
}: {
  settings: CartSettings;
  checkoutBlocks: InfoBlock[];
}) {
  const { items, setQty: ctxSetQty, remove: ctxRemove, add: ctxAdd, clear: ctxClear } = useCart();
  const firstPayment = (settings.payments.find((p) => p.enabled)?.key ?? "sbp") as CheckoutState["payment"];
  const firstDelivery = (settings.delivery.find((d) => d.enabled)?.key ?? "pickup") as CheckoutState["delivery"];
  const [state, setState] = React.useState<CheckoutState>({
    customerType: "person",
    mode: "guest",
    phone: "+7 ",
    email: "",
    name: "",
    delivery: firstDelivery,
    deliveryTime: "any",
    payment: firstPayment,
    agreement: true,
  });
  const { user, ready: authReady, updateProfile } = useAuth();
  const [attempted, setAttempted] = React.useState(false);
  const [order, setOrder] = React.useState<{ id: string } | null>(null);
  const [submitPending, setSubmitPending] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState({ oferta: false, pd: false, marketing: false });
  // Авторизованный пользователь дал согласия при регистрации — в корзине их не спрашиваем.
  React.useEffect(() => {
    if (user) setConsent({ oferta: true, pd: true, marketing: false });
  }, [user]);
  const [promo, setPromo] = React.useState<ValidatedPromo | null>(null);
  const applyPromo = React.useCallback(async (code: string): Promise<string | null> => {
    const res = await validatePromoCode(code);
    if (res.error || !res.promo) return res.error ?? "Не удалось применить промокод";
    setPromo(res.promo);
    return null;
  }, []);
  const clearPromo = React.useCallback(() => setPromo(null), []);
  const [undo, setUndo] = React.useState<{ item: CartItem } | null>(null);
  const prefilled = React.useRef(false);

  // Автоподстановка данных покупателя из профиля (один раз после загрузки сессии).
  React.useEffect(() => {
    if (!authReady || prefilled.current) return;
    if (user) {
      prefilled.current = true;
      setState((s) => ({
        ...s,
        name: s.name || user.name || "",
        phone: !s.phone || s.phone.trim() === "+7" ? user.phone || s.phone : s.phone,
        email: s.email || user.email || "",
        deliveryAddress: s.deliveryAddress || user.address || "",
      }));
    }
  }, [authReady, user]);
  const undoTimer = React.useRef<number | null>(null);

  const update = React.useCallback((next: Partial<CheckoutState>) => {
    setState((s) => ({ ...s, ...next }));
  }, []);

  const setQty = (productId: string, qty: number) => {
    const clamped = Math.max(1, Math.min(MAX_QTY, Math.round(qty) || 1));
    void ctxSetQty(productId, clamped);
  };

  const remove = (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;
    setUndo({ item });
    void ctxRemove(productId);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);
  };

  const restore = () => {
    if (!undo) return;
    void ctxAdd(undo.item.product, undo.item.qty);
    setUndo(null);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
  };

  React.useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  // Воронка: пользователь зашёл в оформление.
  React.useEffect(() => {
    trackFunnel("begin_checkout", { items_count: items.length });
    ymReachGoal("checkout_start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // База цены выбранного способа оплаты — отражается в строках корзины.
  const itemBase: "cash" | "card" = React.useMemo(() => {
    const pm = settings.payments.find((p) => p.key === state.payment);
    return pm?.priceBase === "card" ? "card" : "cash";
  }, [settings.payments, state.payment]);

  const requiresAddress = !!settings.delivery.find((d) => d.key === state.delivery)?.requiresAddress;
  const errors = React.useMemo(
    () => validateCheckout(state, items, requiresAddress),
    [state, items, requiresAddress]
  );
  const errorCount = Object.keys(errors).length;

  const totalQty = items.reduce((acc, i) => acc + i.qty, 0);

  const handleSubmit = () => {
    setAttempted(true);
    if (items.length === 0 || errorCount > 0) return;
    if (!consent.pd) return; // 152-ФЗ: без согласия на обработку ПДн заказ не оформляется
    if (submitPending) return;

    setSubmitError(null);
    setSubmitPending(true);
    trackFunnel("submit_order", { items_count: items.length });

    // Суммы по выбранному способу оплаты: база цены (наличными/картой) + наценка.
    const payMethod = settings.payments.find((p) => p.key === state.payment);
    const base = payMethod?.priceBase === "card" ? "card" : "cash";
    const subtotal = items.reduce(
      (acc, i) => acc + (base === "card" ? i.product.priceCard : i.product.priceCash) * i.qty,
      0
    );
    const discountCash =
      base === "cash"
        ? items.reduce((acc, i) => acc + (i.product.priceCard - i.product.priceCash) * i.qty, 0)
        : 0;
    const surcharge = payMethod?.surcharge ? Math.round((subtotal * payMethod.surcharge) / 100) : 0;
    const promoDiscount = computePromoDiscount(promo, items, base).amount;
    const total = Math.max(0, subtotal + surcharge - promoDiscount);

    placeOrder({
      items: items.map((i) => ({
        productId: i.productId,
        title: i.product.title,
        image: i.product.image,
        qty: i.qty,
        priceCash: i.product.priceCash,
        priceCard: i.product.priceCard,
      })),
      customerType: state.customerType === "company" ? "legal" : "individual",
      name: state.name,
      phone: state.phone,
      email: state.email || undefined,
      deliveryMethod: state.delivery,
      deliveryAddress: state.deliveryAddress,
      paymentMethod: state.payment,
      subtotal,
      discountCash,
      total,
      promoCode: promo?.code,
      promoDiscount,
      consentOferta: true, // принятие оферты — факт оформления заказа (текст под кнопкой)
      consentPd: consent.pd,
      consentMarketing: consent.marketing,
    }).then((result) => {
      setSubmitPending(false);
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      // Номер из БД (заказ уже сохранён в БД через placeOrder) или fallback.
      const displayId = result.orderNumber ?? `PT-${Date.now().toString().slice(-6)}`;

      trackFunnel("pay_order", { order: displayId, total });
      // Я.Метрика: цель «заказ» + e-commerce выручка.
      ymReachGoal("order", { order_price: total, currency: "RUB" });
      ymPurchase({
        id: displayId,
        total,
        items: items.map((i) => ({ id: i.productId, name: i.product.title, price: i.product.priceCash, quantity: i.qty })),
      });
      // Сохраняем данные покупателя в профиль (если вошёл).
      if (user) {
        updateProfile({
          name: state.name || user.name,
          phone: state.phone || user.phone,
          email: state.email || user.email,
        });
      }
      void ctxClear();
      setOrder({ id: displayId });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(() => {
      setSubmitPending(false);
      setSubmitError("Не удалось оформить заказ. Проверьте соединение и попробуйте снова.");
    });
  };

  if (order) {
    return (
      <section className="bg-surface">
        <div className="container-page pt-8 md:pt-10 pb-16 md:pb-24">
          <div className="mx-auto max-w-xl rounded-3xl bg-white border border-border/60 p-8 md:p-10 text-center">
            <span
              aria-hidden
              className="inline-flex size-14 items-center justify-center rounded-full bg-ink text-white mb-5"
            >
              <Check className="size-7" />
            </span>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-ink">
              Заказ {order.id} принят
            </h1>
            <p className="mt-3 text-[15px] text-ink-muted leading-relaxed">
              Менеджер позвонит на {state.phone || "указанный номер"} в течение
              15 минут, чтобы подтвердить детали. Спасибо, что выбрали
              PhoneTrade.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a
                href="/category/iphone"
                className="inline-flex items-center h-11 px-6 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
              >
                Продолжить покупки
              </a>
              <a
                href="/"
                className="inline-flex items-center h-11 px-6 rounded-full border border-border text-ink text-sm font-medium hover:border-ink/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                На главную
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface">
      <div className="container-page pt-8 md:pt-10 pb-16 md:pb-24">
        <a
          href="/category/iphone"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Вернуться в каталог
        </a>
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-[-0.03em] text-ink">
            Оформление заказа
          </h1>
          {totalQty > 0 && (
            <span className="text-sm text-ink-muted tabular-nums">
              {totalQty} {pluralizeItems(totalQty)} ·{" "}
              <a
                href="/category/iphone"
                className="text-ink underline-offset-4 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                Добавить ещё
              </a>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 flex flex-col gap-4 md:gap-5">
            <SectionStep
              step={1}
              title="Корзина"
              hint={
                items.length > 0
                  ? `${totalQty} ${pluralizeItems(totalQty)} в корзине`
                  : "Пока пусто"
              }
            >
              <CartItemsSection items={items} onQty={setQty} onRemove={remove} onClear={() => void ctxClear()} base={itemBase} />
            </SectionStep>

            {items.length > 0 && (
              <>
                <CustomerSection
                  state={state}
                  onChange={update}
                  errors={errors}
                  showErrors={attempted}
                  loggedIn={!!user}
                  userName={user?.name}
                  consent={consent}
                  onConsent={(patch) => setConsent((c) => ({ ...c, ...patch }))}
                />
                <DeliverySection
                  state={state}
                  onChange={update}
                  errors={errors}
                  showErrors={attempted}
                  options={settings.delivery}
                />
                <PaymentSection state={state} onChange={update} methods={settings.payments} />
              </>
            )}
          </div>

          <div className="lg:col-span-4 lg:self-stretch flex flex-col gap-3">
            <OrderSummary
              items={items}
              state={state}
              attempted={attempted}
              errorCount={errorCount}
              onSubmit={handleSubmit}
              blocks={checkoutBlocks}
              delivery={settings.delivery}
              payments={settings.payments}
              promo={promo}
              onApplyPromo={applyPromo}
              onClearPromo={clearPromo}
            />
            {submitPending && (
              <p className="text-[13px] text-ink-muted text-center animate-pulse px-2">
                Оформляем заказ…
              </p>
            )}
            {submitError && (
              <p className="text-[13px] text-sale text-center px-2" role="alert">
                {submitError}
              </p>
            )}
          </div>
        </div>
      </div>

      {undo && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-full bg-ink text-white pl-5 pr-2 py-2 shadow-lg">
            <span className="text-sm">
              «{undo.item.product.title}» удалён
            </span>
            <button
              type="button"
              onClick={restore}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white/15 text-sm font-medium hover:bg-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Вернуть
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
