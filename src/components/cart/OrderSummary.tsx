"use client";

import * as React from "react";
import { X } from "lucide-react";
import { formatPrice } from "@/lib/utils/format-price";
import { pluralizeItems } from "@/lib/utils/plural";
import { resolveIcon } from "@/lib/admin/icons";
import type { CartItem, CheckoutState } from "@/lib/cart/types";
import type { InfoBlock, CartDeliveryOption, CartPaymentMethod } from "@/lib/content";
import { computePromoDiscount, type ValidatedPromo } from "@/lib/cart/promo";
import { cn } from "@/lib/utils/cn";

export type Consent = { oferta: boolean; pd: boolean; marketing: boolean };

type Props = {
  items: CartItem[];
  state: CheckoutState;
  onSubmit: () => void;
  attempted: boolean;
  errorCount: number;
  blocks: InfoBlock[];
  delivery: CartDeliveryOption[];
  payments: CartPaymentMethod[];
  consent: Consent;
  onConsent: (patch: Partial<Consent>) => void;
  /** Показывать чекбоксы согласий (только гостям; авторизованные дали при регистрации). */
  showConsent?: boolean;
  promo: ValidatedPromo | null;
  onApplyPromo: (code: string) => Promise<string | null>;
  onClearPromo: () => void;
};

const CREDIT_MONTHS = 24;

export function OrderSummary({
  items,
  state,
  onSubmit,
  attempted,
  errorCount,
  blocks,
  delivery,
  payments,
  consent,
  onConsent,
  showConsent = true,
  promo,
  onApplyPromo,
  onClearPromo,
}: Props) {
  const deliveryOpt = delivery.find((d) => d.key === state.delivery);
  const paymentOpt = payments.find((p) => p.key === state.payment);
  const base = paymentOpt?.priceBase === "card" ? "card" : "cash";
  const DELIVERY_LABEL: Record<string, string> = Object.fromEntries(
    delivery.map((d) => [d.key, d.label])
  );
  const [promoInput, setPromoInput] = React.useState("");
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [promoPending, setPromoPending] = React.useState(false);

  const totalQty = items.reduce((acc, i) => acc + i.qty, 0);
  // Сумма по выбранной базе цены (наличными/картой) выбранного способа оплаты.
  const subtotal = items.reduce(
    (acc, i) => acc + (base === "card" ? i.product.priceCard : i.product.priceCash) * i.qty,
    0
  );
  const surchargePct = paymentOpt?.surcharge ?? 0;
  const surchargeAmount = surchargePct > 0 ? Math.round((subtotal * surchargePct) / 100) : 0;
  const deliveryPrice =
    deliveryOpt && deliveryOpt.price > 0 && !(deliveryOpt.freeFrom > 0 && subtotal >= deliveryOpt.freeFrom)
      ? deliveryOpt.price
      : 0;
  const promoCalc = computePromoDiscount(promo, items, base);
  const promoDiscount = promoCalc.amount;
  const total = Math.max(0, subtotal + surchargeAmount + deliveryPrice - promoDiscount);
  const monthly = Math.ceil(total / CREDIT_MONTHS);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code || promoPending) return;
    setPromoPending(true);
    setPromoError(null);
    const err = await onApplyPromo(code);
    setPromoPending(false);
    if (err) setPromoError(err);
  };

  const clearPromo = () => {
    onClearPromo();
    setPromoInput("");
    setPromoError(null);
  };

  return (
    <div className="lg:sticky lg:top-[88px] flex flex-col gap-4">
      <div className="rounded-3xl bg-white border border-border/60 p-6">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-lg font-semibold text-ink">Ваш заказ</h2>
          <span className="text-sm text-ink-muted">
            {totalQty} {pluralizeItems(totalQty)}
          </span>
        </div>

        <dl className="space-y-2.5 text-sm pb-5 border-b border-dashed border-border/70 mt-4">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">
              Товары · {base === "card" ? "цена картой" : "цена наличными"}
            </dt>
            <dd className="text-ink tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          {surchargeAmount > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">
                Наценка{paymentOpt ? ` · ${paymentOpt.label}` : ""} +{surchargePct}%
              </dt>
              <dd className="text-ink tabular-nums">+ {formatPrice(surchargeAmount)}</dd>
            </div>
          )}
          {promoDiscount > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Промокод {promo?.code}</dt>
              <dd className="text-sale tabular-nums">
                − {formatPrice(promoDiscount)}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">
              {DELIVERY_LABEL[state.delivery] ?? "Доставка"}
            </dt>
            <dd
              className={
                deliveryPrice === 0
                  ? "text-emerald-700 font-medium"
                  : "text-ink tabular-nums"
              }
            >
              {deliveryPrice === 0 ? "Бесплатно" : formatPrice(deliveryPrice)}
            </dd>
          </div>
        </dl>

        <div className="flex items-baseline justify-between mt-5 mb-1">
          <span className="text-sm text-ink-muted">Итого к оплате</span>
          <span
            aria-live="polite"
            className="text-[28px] font-bold text-ink tracking-tight tabular-nums leading-none"
          >
            {formatPrice(total)}
          </span>
        </div>
        {state.payment === "credit" ? (
          <p className="text-right text-[12px] text-ink-muted mb-4">
            ≈ {formatPrice(monthly)}/мес на {CREDIT_MONTHS} мес
          </p>
        ) : (
          <div className="mb-4" />
        )}

        {/* Промокод — под ценой */}
        <div className="mb-6">
          {promo ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2">
              <span className="text-[13px] text-ink">
                Промокод <span className="font-semibold">{promo.code}</span>
                {promoDiscount > 0 ? " применён" : ""}
              </span>
              <button
                type="button"
                onClick={clearPromo}
                aria-label="Убрать промокод"
                className="inline-flex size-7 items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value);
                  setPromoError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                placeholder="Промокод"
                aria-label="Промокод"
                className={cn(
                  "flex-1 h-10 px-3 rounded-xl bg-surface text-sm text-ink uppercase placeholder:normal-case placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 transition-colors",
                  promoError ? "ring-2 ring-sale/50 focus:ring-sale/60" : "focus:ring-ink/15"
                )}
              />
              <button
                type="button"
                onClick={applyPromo}
                disabled={promoPending}
                className="h-10 px-4 rounded-xl bg-ink text-white text-sm font-medium hover:bg-ink/85 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                {promoPending ? "…" : "Применить"}
              </button>
            </div>
          )}
          {promoError && <p className="mt-1.5 text-[12px] text-sale">{promoError}</p>}
          {promo && promoDiscount === 0 && promoCalc.note && (
            <p className="mt-1.5 text-[12px] text-ink-muted">{promoCalc.note}</p>
          )}
        </div>

        {/* Согласия (152-ФЗ) — только гостям; авторизованные дали при регистрации */}
        {showConsent && (
        <div className="mb-4 space-y-2.5">
          <label className="flex items-start gap-2.5 text-[12.5px] leading-snug text-ink-muted cursor-pointer">
            <input type="checkbox" checked={consent.oferta} onChange={(e) => onConsent({ oferta: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]" />
            <span>Принимаю <a href="/offer" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">условия оферты</a> и <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">политику конфиденциальности</a></span>
          </label>
          <label className="flex items-start gap-2.5 text-[12.5px] leading-snug text-ink-muted cursor-pointer">
            <input type="checkbox" checked={consent.pd} onChange={(e) => onConsent({ pd: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]" />
            <span>Даю <a href="/consent" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">согласие на обработку персональных данных</a> для оформления и исполнения заказа</span>
          </label>
          <label className="flex items-start gap-2.5 text-[12.5px] leading-snug text-ink-subtle cursor-pointer">
            <input type="checkbox" checked={consent.marketing} onChange={(e) => onConsent({ marketing: e.target.checked })} className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]" />
            <span>Хочу получать акции и новинки (необязательно)</span>
          </label>
        </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={showConsent && (!consent.oferta || !consent.pd)}
          className="inline-flex w-full items-center justify-center gap-2 h-12 px-7 rounded-2xl bg-ink text-white text-sm font-medium hover:bg-ink/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Подтвердить заказ
        </button>

        {attempted && errorCount > 0 && (
          <p className="mt-2 text-[12px] text-sale text-center" role="alert">
            Заполните выделенные поля, чтобы продолжить
          </p>
        )}
        {showConsent && attempted && errorCount === 0 && (!consent.oferta || !consent.pd) && (
          <p className="mt-2 text-[12px] text-sale text-center" role="alert">
            Необходимо принять оферту и согласие на обработку персональных данных
          </p>
        )}
      </div>

      {blocks.length > 0 && (
        <ul className="rounded-3xl bg-white border border-border/60 divide-y divide-border/60">
          {blocks.map((b, i) => {
            const Icon = resolveIcon(b.icon);
            return (
              <li key={`${b.title}-${i}`} className="flex items-start gap-3 p-4">
                <span
                  aria-hidden
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-ink"
                >
                  <Icon className="size-[16px]" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-ink">{b.title}</p>
                  <p className="text-[12px] text-ink-muted leading-snug">{b.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
