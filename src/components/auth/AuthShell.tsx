"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Gift,
  PackageCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth, normalizePhone } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

type Mode = "login" | "register";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PERKS = [
  { icon: PackageCheck, text: "История и статусы всех заказов" },
  { icon: Gift, text: "Бонусы и персональные промокоды" },
  { icon: Sparkles, text: "Быстрое оформление в один тап" },
];

export function AuthShell() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register } = useAuth();

  const returnTo = params.get("returnTo") || "/account";
  const [mode, setMode] = React.useState<Mode>(
    params.get("mode") === "register" ? "register" : "login"
  );

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("+7 ");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (normalizePhone(phone).length < 11) {
      setError("Укажите корректный номер телефона");
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError("Проверьте формат e-mail");
      return;
    }

    try {
      if (mode === "register") {
        if (!name.trim()) {
          setError("Как к вам обращаться?");
          return;
        }
        register({ name, phone, email });
      } else {
        login(phone);
      }
      router.push(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Что-то пошло не так");
    }
  };

  return (
    <section className="bg-surface">
      <div className="container-page py-8 md:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-6 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          <ChevronLeft className="size-4" aria-hidden />
          На главную
        </Link>

        <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 items-stretch">
          {/* Brand / value panel */}
          <div className="hidden lg:flex flex-col justify-between rounded-3xl bg-ink text-white p-10 overflow-hidden">
            <div>
              <span className="text-2xl font-semibold tracking-[-0.02em]">
                PhoneTrade
              </span>
              <h1 className="mt-10 text-4xl font-semibold tracking-[-0.03em] leading-[1.05] text-balance">
                Личный кабинет
                <br />
                для своих
              </h1>
              <p className="mt-4 text-white/60 text-[15px] leading-relaxed max-w-sm">
                Apple-техника в Белгороде с гарантией. Войдите, чтобы следить за
                заказами и копить бонусы.
              </p>
            </div>
            <ul className="mt-12 space-y-4">
              {PERKS.map((perk) => (
                <li key={perk.text} className="flex items-center gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <perk.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="text-[15px] text-white/85">{perk.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form panel */}
          <div className="rounded-3xl bg-white border border-border/60 p-6 sm:p-8 md:p-10 flex flex-col justify-center">
            <div className="mx-auto w-full max-w-sm">
              <div
                role="tablist"
                aria-label="Вход или регистрация"
                className="grid grid-cols-2 gap-1 p-1 rounded-full bg-surface mb-7"
              >
                {(["login", "register"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => {
                      setMode(m);
                      setError(null);
                    }}
                    className={cn(
                      "h-10 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                      mode === m
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink"
                    )}
                  >
                    {m === "login" ? "Вход" : "Регистрация"}
                  </button>
                ))}
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                {mode === "login" ? "С возвращением" : "Создать аккаунт"}
              </h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                {mode === "login"
                  ? "Введите номер, чтобы войти"
                  : "Минимум данных — только самое нужное"}
              </p>

              <form onSubmit={submit} className="mt-6 flex flex-col gap-3" noValidate>
                {mode === "register" && (
                  <AuthField
                    id="auth-name"
                    label="Имя"
                    required
                    autoComplete="name"
                    placeholder="Как к вам обращаться"
                    value={name}
                    onChange={setName}
                  />
                )}
                <AuthField
                  id="auth-phone"
                  label="Телефон"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+7 ___ ___-__-__"
                  value={phone}
                  onChange={setPhone}
                />
                {mode === "register" && (
                  <AuthField
                    id="auth-email"
                    label="E-mail"
                    optional
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="вы@почта.ру"
                    value={email}
                    onChange={setEmail}
                  />
                )}

                {error && (
                  <p className="text-[13px] text-sale" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-2 inline-flex w-full items-center justify-center h-12 rounded-2xl bg-ink text-white text-sm font-medium hover:bg-ink/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
                >
                  {mode === "login" ? "Войти" : "Создать аккаунт"}
                </button>
              </form>

              <p className="mt-5 text-center text-[13px] text-ink-muted">
                {mode === "login" ? "Ещё нет аккаунта? " : "Уже с нами? "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError(null);
                  }}
                  className="text-ink font-medium underline-offset-4 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                >
                  {mode === "login" ? "Зарегистрироваться" : "Войти"}
                </button>
              </p>

              <p className="mt-6 text-center text-[12px] text-ink-subtle leading-relaxed">
                Продолжая, вы соглашаетесь с{" "}
                <Link href="/offer" className="underline underline-offset-4">
                  офертой
                </Link>{" "}
                и{" "}
                <Link href="/privacy" className="underline underline-offset-4">
                  политикой данных
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthField({
  id,
  label,
  value,
  onChange,
  required,
  optional,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoComplete?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-ink-subtle mb-1.5">
        <span>
          {label}
          {required && " *"}
        </span>
        {optional && <span className="normal-case tracking-normal">необязательно</span>}
      </span>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 px-4 rounded-xl bg-surface text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors"
      />
    </label>
  );
}
