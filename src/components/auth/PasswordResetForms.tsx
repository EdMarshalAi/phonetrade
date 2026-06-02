"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { requestPasswordReset, resetPassword } from "@/lib/auth/password-reset";

const inputCls = (err?: boolean) =>
  cn(
    "h-11 w-full rounded-lg border bg-white pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-subtle",
    "transition-colors focus:outline-none focus:ring-2 focus:ring-ink/15",
    err ? "border-sale/50 focus:border-sale" : "border-border focus:border-ink"
  );
const btnCls =
  "mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[15px] font-medium text-white transition-all hover:bg-ink/90 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60";

/** Запрос ссылки сброса: ввод email → письмо. */
export function RequestResetForm({ audience, loginHref }: { audience: "storefront" | "admin"; loginHref: string }) {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await requestPasswordReset(email.trim(), audience);
    setPending(false);
    if (res.error) { setError(res.error); return; }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" strokeWidth={1.75} />
        <p className="text-[15px] font-medium text-ink">Письмо отправлено</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          Если аккаунт с таким e-mail существует, мы отправили на него ссылку для восстановления пароля. Проверьте почту (и папку «Спам») — ссылка действует 1 час.
        </p>
        <Link href={loginHref} className="mt-5 inline-block text-[14px] font-medium text-ink underline-offset-4 hover:underline">
          Вернуться ко входу
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <p role="alert" className="rounded-lg border border-sale/25 bg-sale/5 px-3 py-2 text-[13px] text-sale">{error}</p>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">E-mail</span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" strokeWidth={1.75} />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="вы@почта.ру"
            className={inputCls(!!error)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </label>
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Отправляем…" : "Отправить ссылку"}
      </button>
      <p className="text-center text-[13px] text-ink-muted">
        Вспомнили пароль?{" "}
        <Link href={loginHref} className="font-medium text-ink underline-offset-4 hover:underline">Войти</Link>
      </p>
    </form>
  );
}

/** Установка нового пароля по токену из письма. */
export function SetPasswordForm({ token, loginHref }: { token: string; loginHref: string }) {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Пароль — минимум 6 символов"); return; }
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    setPending(true);
    const res = await resetPassword(token, password);
    setPending(false);
    if (res.error) { setError(res.error); return; }
    setDone(true);
    const dest = res.audience === "admin" ? "/admin/login" : loginHref;
    setTimeout(() => router.replace(dest), 1800);
  };

  if (!token) {
    return (
      <p role="alert" className="rounded-lg border border-sale/25 bg-sale/5 px-3 py-2 text-[13px] text-sale">
        Ссылка недействительна. Запросите восстановление пароля заново.
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" strokeWidth={1.75} />
        <p className="text-[15px] font-medium text-ink">Пароль обновлён</p>
        <p className="mt-1.5 text-[13px] text-ink-muted">Перенаправляем на страницу входа…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error ? (
        <p role="alert" className="rounded-lg border border-sale/25 bg-sale/5 px-3 py-2 text-[13px] text-sale">{error}</p>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Новый пароль</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" strokeWidth={1.75} />
          <input type="password" autoComplete="new-password" placeholder="Минимум 6 символов" className={inputCls(!!error)} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Повторите пароль</span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" strokeWidth={1.75} />
          <input type="password" autoComplete="new-password" placeholder="Ещё раз" className={inputCls(!!error)} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      </label>
      <button type="submit" disabled={pending} className={btnCls}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Сохраняем…" : "Сохранить пароль"}
      </button>
    </form>
  );
}
