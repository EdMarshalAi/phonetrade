"use client";

import * as React from "react";
import { Banknote, CreditCard, Smartphone, Wallet } from "lucide-react";
import { SectionStep } from "@/components/cart/SectionStep";
import type { CheckoutState, PaymentMethod } from "@/lib/cart/types";
import type { CartPaymentMethod, PaymentKey } from "@/lib/content";
import { cn } from "@/lib/utils/cn";

type Props = {
  state: CheckoutState;
  onChange: (next: Partial<CheckoutState>) => void;
  methods: CartPaymentMethod[];
};

const PAYMENT_ICON: Record<PaymentKey, React.ComponentType<{ className?: string }>> = {
  sbp: Smartphone,
  card: CreditCard,
  cash: Banknote,
  credit: Wallet,
};

export function PaymentSection({ state, onChange, methods }: Props) {
  const enabled = methods.filter((m) => m.enabled);
  return (
    <SectionStep
      step={4}
      title="Способ оплаты"
      hint="Все способы безопасны и защищены SSL"
    >
      <ul className="grid sm:grid-cols-2 gap-2">
        {enabled.map((m) => {
          const active = state.payment === m.key;
          const Icon = PAYMENT_ICON[m.key];
          return (
            <li key={m.key}>
              <button
                type="button"
                onClick={() => onChange({ payment: m.key as PaymentMethod })}
                aria-pressed={active}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                  active
                    ? "border-ink bg-surface/60"
                    : "border-border/60 bg-white hover:border-ink/30"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-xl shrink-0",
                      active ? "bg-ink text-white" : "bg-surface text-ink"
                    )}
                  >
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{m.label}</p>
                    <p className="text-[12px] text-ink-muted mt-0.5">
                      {m.note}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className={cn(
                      "ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-full border mt-0.5",
                      active
                        ? "bg-ink border-ink"
                        : "bg-white border-border/60"
                    )}
                  >
                    {active && (
                      <span className="size-2 rounded-full bg-white" />
                    )}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {state.payment === "sbp" && (
        <div className="mt-4 rounded-2xl bg-surface border border-border/60 p-4 text-[13px] text-ink-muted leading-relaxed">
          После подтверждения заказа откроется приложение вашего банка для
          оплаты по QR-коду. Без комиссии, без ввода реквизитов.
        </div>
      )}
      {state.payment === "credit" && (
        <div className="mt-4 rounded-2xl bg-surface border border-border/60 p-4 text-[13px] text-ink-muted leading-relaxed">
          Подайте заявку онлайн, решение от банка — 5 минут. Партнёры: Тинькофф,
          Альфа, Сбер. Возможна рассрочка 0-0-24.
        </div>
      )}
    </SectionStep>
  );
}
