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

const INITIAL_STATE: CheckoutState = {
  customerType: "person",
  mode: "guest",
  phone: "+7 ",
  email: "",
  name: "",
  delivery: "pickup",
  deliveryTime: "any",
  payment: "sbp",
  agreement: true,
};

type Props = {
  initialItems: CartItem[];
};

export function CartShell({ initialItems }: Props) {
  const [items, setItems] = React.useState<CartItem[]>(initialItems);
  const [state, setState] = React.useState<CheckoutState>(INITIAL_STATE);
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
  const [attempted, setAttempted] = React.useState(false);
  const [order, setOrder] = React.useState<{ id: string } | null>(null);
  const [undo, setUndo] = React.useState<{ item: CartItem; index: number } | null>(
    null
  );
  const undoTimer = React.useRef<number | null>(null);

  const update = React.useCallback((next: Partial<CheckoutState>) => {
    setState((s) => ({ ...s, ...next }));
  }, []);

  const setQty = (productId: string, qty: number) => {
    const clamped = Math.max(1, Math.min(MAX_QTY, Math.round(qty) || 1));
    setItems((arr) =>
      arr.map((i) => (i.productId === productId ? { ...i, qty: clamped } : i))
    );
  };

  const remove = (productId: string) => {
    const index = items.findIndex((i) => i.productId === productId);
    if (index === -1) return;
    setUndo({ item: items[index], index });
    setItems((arr) => arr.filter((i) => i.productId !== productId));
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);
  };

  const restore = () => {
    if (!undo) return;
    setItems((arr) => {
      if (arr.some((i) => i.productId === undo.item.productId)) return arr;
      const next = [...arr];
      next.splice(Math.min(undo.index, next.length), 0, undo.item);
      return next;
    });
    setUndo(null);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  React.useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const errors = React.useMemo(
    () => validateCheckout(state, items),
    [state, items]
  );
  const errorCount = Object.keys(errors).length;

  const totalQty = items.reduce((acc, i) => acc + i.qty, 0);

  const handleSubmit = () => {
    setAttempted(true);
    if (items.length === 0 || errorCount > 0) return;
    const id = `BG-${Date.now().toString().slice(-6)}`;
    setOrder({ id });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-12 items-start">
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
              <CartItemsSection
                items={items}
                favorites={favorites}
                onQty={setQty}
                onRemove={remove}
                onToggleFavorite={toggleFavorite}
              />
            </SectionStep>

            {items.length > 0 && (
              <>
                <CustomerSection
                  state={state}
                  onChange={update}
                  errors={errors}
                  showErrors={attempted}
                />
                <DeliverySection
                  state={state}
                  onChange={update}
                  errors={errors}
                  showErrors={attempted}
                />
                <PaymentSection state={state} onChange={update} />
              </>
            )}
          </div>

          <div className="lg:col-span-4 lg:self-stretch">
            <OrderSummary
              items={items}
              state={state}
              attempted={attempted}
              errorCount={errorCount}
              onSubmit={handleSubmit}
            />
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
