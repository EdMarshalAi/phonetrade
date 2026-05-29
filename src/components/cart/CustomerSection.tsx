"use client";

import * as React from "react";
import { ArrowRight, Zap } from "lucide-react";
import { SectionStep } from "@/components/cart/SectionStep";
import type { CheckoutMode, CheckoutState } from "@/lib/cart/types";
import type { CheckoutErrors } from "@/lib/cart/validate";
import { cn } from "@/lib/utils/cn";

type Props = {
  state: CheckoutState;
  onChange: (next: Partial<CheckoutState>) => void;
  errors: CheckoutErrors;
  showErrors: boolean;
};

const MODE_TABS: { value: CheckoutMode; label: string; hint: string }[] = [
  {
    value: "guest",
    label: "Быстрое оформление",
    hint: "Без регистрации — оформим за 2 минуты",
  },
  {
    value: "login",
    label: "Войти",
    hint: "Получите бонусы и историю заказов",
  },
];

export function CustomerSection({ state, onChange, errors, showErrors }: Props) {
  const err = (field: keyof CheckoutErrors) =>
    showErrors ? errors[field] : undefined;

  return (
    <SectionStep
      step={2}
      title="Данные покупателя"
      hint="Нужны для связи и подтверждения заказа"
    >
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          type="button"
          onClick={() => onChange({ customerType: "person" })}
          className={cn(
            "inline-flex items-center h-10 px-5 rounded-full text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
            state.customerType === "person"
              ? "bg-ink text-white border-ink"
              : "bg-white text-ink border-border hover:border-ink/30"
          )}
        >
          Физическое лицо
        </button>
        <button
          type="button"
          onClick={() => onChange({ customerType: "company" })}
          className={cn(
            "inline-flex items-center h-10 px-5 rounded-full text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
            state.customerType === "company"
              ? "bg-ink text-white border-ink"
              : "bg-white text-ink border-border hover:border-ink/30"
          )}
        >
          Юридическое лицо
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 mb-6">
        {MODE_TABS.map((t) => {
          const active = state.mode === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ mode: t.value })}
              className={cn(
                "relative text-left rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                active
                  ? "border-ink bg-surface/60"
                  : "border-border/60 bg-white hover:border-ink/30"
              )}
            >
              <div className="flex items-center gap-2">
                {t.value === "guest" && (
                  <Zap className="size-4 text-ink" aria-hidden />
                )}
                <span className="text-sm font-semibold text-ink">
                  {t.label}
                </span>
                {active && (
                  <ArrowRight
                    className="ml-auto size-4 text-ink"
                    aria-hidden
                  />
                )}
              </div>
              <p className="mt-1 text-[12px] text-ink-muted leading-snug">
                {t.hint}
              </p>
            </button>
          );
        })}
      </div>

      {state.customerType === "company" && (
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <Field
            id="companyName"
            label="Название компании"
            required
            autoComplete="organization"
            placeholder="ООО «Ромашка»"
            value={state.companyName ?? ""}
            onChange={(v) => onChange({ companyName: v })}
            error={err("companyName")}
          />
          <Field
            id="companyInn"
            label="ИНН"
            required
            inputMode="numeric"
            placeholder="10 или 12 цифр"
            value={state.companyInn ?? ""}
            onChange={(v) => onChange({ companyInn: v })}
            error={err("companyInn")}
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field
          id="phone"
          label="Телефон"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 ___ ___-__-__"
          value={state.phone}
          onChange={(v) => onChange({ phone: v })}
          error={err("phone")}
        />
        <Field
          id="email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="вы@почта.ру"
          value={state.email}
          onChange={(v) => onChange({ email: v })}
          error={err("email")}
        />
        <Field
          id="name"
          label="Как к вам обращаться"
          required
          autoComplete="name"
          placeholder="Имя"
          value={state.name}
          onChange={(v) => onChange({ name: v })}
          error={err("name")}
        />
        {state.mode === "login" && (
          <Field
            id="password"
            label="Пароль"
            required
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={state.password ?? ""}
            onChange={(v) => onChange({ password: v })}
            error={err("password")}
            action={
              <a
                href="/auth/login"
                className="text-[12px] text-ink-muted hover:text-ink underline-offset-4 hover:underline"
              >
                Забыли?
              </a>
            }
          />
        )}
      </div>

      <label htmlFor="comment" className="block mt-3">
        <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-subtle mb-1.5">
          Комментарий к заказу
        </span>
        <textarea
          id="comment"
          rows={2}
          placeholder="Например: позвонить за час до доставки"
          value={state.comment ?? ""}
          onChange={(e) => onChange({ comment: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-surface text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors resize-y"
        />
      </label>

      <p className="mt-4 text-[12px] text-ink-subtle leading-relaxed">
        Нажимая «Подтвердить заказ», вы соглашаетесь с{" "}
        <a href="/offer" className="text-ink underline-offset-4 hover:underline">
          публичной офертой
        </a>{" "}
        и{" "}
        <a
          href="/privacy"
          className="text-ink underline-offset-4 hover:underline"
        >
          политикой обработки данных
        </a>
        .
      </p>
    </SectionStep>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  error,
  action,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoComplete?: string;
  error?: string;
  action?: React.ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-ink-subtle mb-1.5">
        <span>
          {label}
          {required && " *"}
        </span>
        {action}
      </span>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          "w-full h-11 px-4 rounded-xl bg-surface text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 transition-colors",
          error ? "ring-2 ring-sale/50 focus:ring-sale/60" : "focus:ring-ink/15"
        )}
      />
      {error && (
        <span id={errorId} className="mt-1 block text-[12px] text-sale">
          {error}
        </span>
      )}
    </label>
  );
}
