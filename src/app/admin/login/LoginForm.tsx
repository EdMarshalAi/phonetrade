"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { loginSchema, type LoginInput } from "@/lib/admin/schemas";
import { signInAction } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/admin";
  const forbidden = params.get("error") === "forbidden";

  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginInput) => {
    setFormError(null);
    startTransition(async () => {
      const res = await signInAction(values);
      if (res.error) {
        setFormError(res.error);
        return;
      }
      router.replace(returnTo);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {forbidden && !formError ? (
        <p className="rounded-sm border border-border/70 bg-surface px-3 py-2 text-[13px] text-ink-muted">
          Сессия истекла или доступ ограничен. Войдите снова.
        </p>
      ) : null}
      {formError ? (
        <p
          role="alert"
          className="rounded-sm border border-sale/25 bg-sale/5 px-3 py-2 text-[13px] text-sale"
        >
          {formError}
        </p>
      ) : null}

      <Field label="Email" error={errors.email?.message}>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            strokeWidth={1.75}
          />
          <input
            type="email"
            autoComplete="username"
            placeholder="you@phonetrade.ru"
            className={inputCls(!!errors.email)}
            {...register("email")}
          />
        </div>
      </Field>

      <Field label="Пароль" error={errors.password?.message}>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            strokeWidth={1.75}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputCls(!!errors.password)}
            {...register("password")}
          />
        </div>
      </Field>

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-ink text-[15px] font-medium text-white",
          "transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-ink/90 active:scale-[0.99]",
          "disabled:pointer-events-none disabled:opacity-60"
        )}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] text-sale">{error}</span> : null}
    </label>
  );
}

function inputCls(hasError: boolean): string {
  return cn(
    "h-11 w-full rounded-sm border bg-white pl-9 pr-3 text-[15px] text-ink placeholder:text-ink-subtle",
    "transition-colors focus:outline-none focus:ring-2 focus:ring-ink/15",
    hasError ? "border-sale/50 focus:border-sale" : "border-border focus:border-ink"
  );
}
