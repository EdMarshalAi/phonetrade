"use client";

import * as React from "react";
import { Zap, LogIn, CircleUserRound } from "lucide-react";
import { SectionStep } from "@/components/cart/SectionStep";
import type { CheckoutState } from "@/lib/cart/types";
import type { CheckoutErrors } from "@/lib/cart/validate";
import type { Consent } from "@/components/cart/OrderSummary";
import { useAuth, normalizePhone } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

type Props = {
  state: CheckoutState;
  onChange: (next: Partial<CheckoutState>) => void;
  errors: CheckoutErrors;
  showErrors: boolean;
  loggedIn?: boolean;
  userName?: string;
  consent: Consent;
  onConsent: (patch: Partial<Consent>) => void;
};

export function CustomerSection({ state, onChange, errors, showErrors, loggedIn, userName, consent, onConsent }: Props) {
  const err = (field: keyof CheckoutErrors) => (showErrors ? errors[field] : undefined);
  const { login, register } = useAuth();

  // guest = быстрое оформление; auth = вход/регистрация
  const tab = state.mode === "login" ? "auth" : "guest";
  const setTab = (t: "guest" | "auth") => onChange({ mode: t === "auth" ? "login" : "guest" });

  return (
    <SectionStep step={2} title="Данные покупателя" hint="Нужны для связи и подтверждения заказа">
      {loggedIn ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 p-4">
          <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
            <CircleUserRound className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Вы вошли{userName ? ` как ${userName}` : ""}</p>
            <p className="text-[12px] text-ink-muted">Данные подставлены из профиля — проверьте и при необходимости поправьте.</p>
          </div>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-2">
          <SegBtn active={tab === "guest"} onClick={() => setTab("guest")} icon={<Zap className="size-4" />} title="Быстрое оформление" hint="Без регистрации, за 2 минуты" />
          <SegBtn active={tab === "auth"} onClick={() => setTab("auth")} icon={<LogIn className="size-4" />} title="Войти" hint="Бонусы и история заказов" />
        </div>
      )}

      {/* Панель входа/регистрации (только для гостя на вкладке «Войти») */}
      {!loggedIn && tab === "auth" ? (
        <AuthPanel defaultPhone={state.phone} login={login} register={register} />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field id="phone" label="Телефон" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 ___ ___-__-__" value={state.phone} onChange={(v) => onChange({ phone: v })} error={err("phone")} />
            <Field id="email" label="E-mail" type="email" inputMode="email" autoComplete="email" placeholder="вы@почта.ру" value={state.email} onChange={(v) => onChange({ email: v })} error={err("email")} />
            <Field id="name" label="Как к вам обращаться" required autoComplete="name" placeholder="Имя" value={state.name} onChange={(v) => onChange({ name: v })} error={err("name")} />
          </div>

          <label htmlFor="comment" className="block mt-3">
            <span className="block text-[11px] uppercase tracking-[0.14em] text-ink-subtle mb-1.5">Комментарий к заказу</span>
            <textarea id="comment" rows={2} placeholder="Например: позвонить за час до доставки" value={state.comment ?? ""} onChange={(e) => onChange({ comment: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-surface text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors resize-y" />
          </label>

          {!loggedIn && (
            <div className="mt-5 space-y-2.5">
              <ConsentRow checked={consent.pd} onChange={(v) => onConsent({ pd: v })}>
                Даю <a href="/consent" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">согласие на обработку персональных данных</a> для оформления и исполнения заказа
              </ConsentRow>
              <ConsentRow checked={consent.marketing} onChange={(v) => onConsent({ marketing: v })} subtle>
                Хочу получать акции и новинки (необязательно)
              </ConsentRow>
              {showErrors && !consent.pd && (
                <p className="text-[12px] text-sale" role="alert">
                  Необходимо дать согласие на обработку персональных данных
                </p>
              )}
              <p className="text-[12px] leading-snug text-ink-subtle">
                Нажимая «Оформить заказ», вы принимаете условия{" "}
                <a href="/offer" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">оферты</a> и{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">политики конфиденциальности</a>
              </p>
            </div>
          )}
        </>
      )}
    </SectionStep>
  );
}

/* ── Панель входа / регистрации ─────────────────────────────────────────────── */

function AuthPanel({
  defaultPhone,
  login,
  register,
}: {
  defaultPhone: string;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: { name: string; phone: string; email?: string; password: string; consentMarketing?: boolean }) => Promise<void>;
}) {
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState(defaultPhone || "+7 ");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [consent, setConsent] = React.useState({ oferta: false, pd: false, marketing: false });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const submit = async () => {
    setError(null);
    if (normalizePhone(phone).length < 11) return setError("Укажите корректный номер телефона");
    if (password.length < 6) return setError("Пароль — минимум 6 символов");
    if (mode === "register" && !name.trim()) return setError("Укажите имя");
    if (mode === "register" && !consent.pd)
      return setError("Необходимо дать согласие на обработку персональных данных");
    setPending(true);
    try {
      if (mode === "register") await register({ name, phone, email, password, consentMarketing: consent.marketing });
      else await login(phone, password);
      // успех → провайдер обновит user, секция перерисуется в «Вы вошли…»
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось войти");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 p-5">
      <p className="mb-4 text-[13px] font-semibold text-ink">
        {mode === "login" ? "Вход в личный кабинет" : "Регистрация"}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {mode === "register" ? (
          <Field id="auth-name" label="Имя" required autoComplete="name" placeholder="Имя" value={name} onChange={setName} />
        ) : null}
        <Field id="auth-phone" label="Телефон" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 ___ ___-__-__" value={phone} onChange={setPhone} />
        {mode === "register" ? (
          <Field id="auth-email" label="E-mail" type="email" inputMode="email" autoComplete="email" placeholder="вы@почта.ру" value={email} onChange={setEmail} />
        ) : null}
        <Field
          id="auth-password"
          label="Пароль"
          required
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Минимум 6 символов"
          value={password}
          onChange={setPassword}
        />
      </div>

      {mode === "register" ? (
        <div className="mt-4 space-y-2">
          <ConsentRow checked={consent.pd} onChange={(v) => setConsent((c) => ({ ...c, pd: v }))}>
            Даю <a href="/consent" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">согласие на обработку персональных данных</a>
          </ConsentRow>
          <ConsentRow checked={consent.marketing} onChange={(v) => setConsent((c) => ({ ...c, marketing: v }))} subtle>
            Хочу получать акции и новинки (необязательно)
          </ConsentRow>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-[12px] text-sale" role="alert">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-ink/85 disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          {pending ? "Подождите…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>
        <button
          type="button"
          onClick={() => { setError(null); setMode((m) => (m === "login" ? "register" : "login")); }}
          className="text-[13px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
      {mode === "register" ? (
        <p className="mt-3 text-[12px] leading-snug text-ink-subtle">
          Нажимая «Зарегистрироваться», вы принимаете условия{" "}
          <a href="/offer" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">оферты</a> и{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">политики конфиденциальности</a>
        </p>
      ) : null}
    </div>
  );
}

/* ── Мелкие контролы ─────────────────────────────────────────────────────────── */

function ConsentRow({ checked, onChange, children, subtle }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; subtle?: boolean }) {
  return (
    <label className={cn("flex items-start gap-2.5 text-[12.5px] leading-snug cursor-pointer", subtle ? "text-ink-subtle" : "text-ink-muted")}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]" />
      <span>{children}</span>
    </label>
  );
}

function SegBtn({ active, onClick, icon, title, hint }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "text-left rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
        active ? "border-ink bg-surface/60" : "border-border/60 bg-white hover:border-ink/30"
      )}
    >
      <div className="flex items-center gap-2 text-ink">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1 text-[12px] text-ink-muted leading-snug">{hint}</p>
    </button>
  );
}

function Field({
  id, label, value, onChange, required, placeholder, type = "text", inputMode, autoComplete, error,
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
}) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-ink-subtle mb-1.5">
        <span>{label}{required && " *"}</span>
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
      {error && <span id={errorId} className="mt-1 block text-[12px] text-sale">{error}</span>}
    </label>
  );
}
