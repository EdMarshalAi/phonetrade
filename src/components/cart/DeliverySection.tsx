"use client";

import * as React from "react";
import { MapPin, Truck } from "lucide-react";
import { SectionStep } from "@/components/cart/SectionStep";
import type {
  CheckoutState,
  DeliveryMethod,
  DeliveryTime,
} from "@/lib/cart/types";
import type { CheckoutErrors } from "@/lib/cart/validate";
import { cn } from "@/lib/utils/cn";

type Props = {
  state: CheckoutState;
  onChange: (next: Partial<CheckoutState>) => void;
  errors: CheckoutErrors;
  showErrors: boolean;
};

const TABS: {
  value: DeliveryMethod;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "pickup",
    label: "Самовывоз",
    hint: "Бесплатно · сегодня",
    icon: MapPin,
  },
  {
    value: "courier",
    label: "Курьер",
    hint: "Бесплатно · завтра",
    icon: Truck,
  },
];

const TIME_OPTIONS: { value: DeliveryTime; label: string }[] = [
  { value: "any", label: "Любое (10:00–20:00)" },
  { value: "morning", label: "Утро (10:00–13:00)" },
  { value: "day", label: "День (13:00–17:00)" },
  { value: "evening", label: "Вечер (17:00–20:00)" },
];

export function DeliverySection({ state, onChange, errors, showErrors }: Props) {
  const addressError = showErrors ? errors.deliveryAddress : undefined;

  return (
    <SectionStep step={3} title="Способ получения" hint="г. Белгород">
      <div className="grid sm:grid-cols-2 gap-2 mb-5">
        {TABS.map((t) => {
          const active = state.delivery === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ delivery: t.value })}
              className={cn(
                "text-left rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                active
                  ? "border-ink bg-surface/60"
                  : "border-border/60 bg-white hover:border-ink/30"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-9 items-center justify-center rounded-xl mb-2",
                  active ? "bg-ink text-white" : "bg-surface text-ink"
                )}
              >
                <t.icon className="size-4" />
              </span>
              <p className="text-sm font-semibold text-ink">{t.label}</p>
              <p className="text-[12px] text-ink-muted mt-0.5">{t.hint}</p>
            </button>
          );
        })}
      </div>

      {state.delivery === "pickup" && (
        <div className="rounded-2xl bg-surface border border-border/60 p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="inline-flex size-10 items-center justify-center rounded-xl bg-white text-ink shrink-0"
            >
              <MapPin className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-ink">
                PhoneTrade · Универмаг Белгород
              </p>
              <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
                ул. Попова, 36 · 1 этаж · ежедневно 10:00–20:00
              </p>
              <p className="mt-3 text-[12px] text-emerald-700 font-medium">
                Готов к выдаче сегодня
              </p>
            </div>
          </div>
        </div>
      )}

      {state.delivery === "courier" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label htmlFor="deliveryAddress" className="block">
            <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-subtle mb-1.5">
              Адрес доставки *
            </span>
            <input
              id="deliveryAddress"
              type="text"
              autoComplete="street-address"
              placeholder="Улица, дом, квартира"
              value={state.deliveryAddress ?? ""}
              onChange={(e) => onChange({ deliveryAddress: e.target.value })}
              aria-invalid={addressError ? true : undefined}
              aria-describedby={
                addressError ? "deliveryAddress-error" : undefined
              }
              className={cn(
                "w-full h-11 px-4 rounded-xl bg-surface text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 transition-colors",
                addressError
                  ? "ring-2 ring-sale/50 focus:ring-sale/60"
                  : "focus:ring-ink/15"
              )}
            />
            {addressError && (
              <span
                id="deliveryAddress-error"
                className="mt-1 block text-[12px] text-sale"
              >
                {addressError}
              </span>
            )}
          </label>
          <label htmlFor="deliveryTime" className="block">
            <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-subtle mb-1.5">
              Желаемое время
            </span>
            <select
              id="deliveryTime"
              value={state.deliveryTime}
              onChange={(e) =>
                onChange({ deliveryTime: e.target.value as DeliveryTime })
              }
              className="w-full h-11 px-4 rounded-xl bg-surface text-[15px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/15"
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </SectionStep>
  );
}
