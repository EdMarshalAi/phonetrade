"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { useAuth, normalizePhone } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(ts));
}

export function ProfileSection() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = React.useState(user?.name ?? "");
  const [phone, setPhone] = React.useState(user?.phone ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [address, setAddress] = React.useState(user?.address ?? "");
  const [error, setError] = React.useState<string | null>(null);

  // Профиль грузится из БД асинхронно — синхронизируем поля, когда пользователь готов.
  const uid = user?.id;
  React.useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
    setEmail(user.email ?? "");
    setAddress(user.address ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
  const [saved, setSaved] = React.useState(false);
  const savedTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, []);

  if (!user) return null;

  const dirty =
    name !== user.name ||
    phone !== user.phone ||
    (email || "") !== (user.email ?? "") ||
    (address || "") !== (user.address ?? "");

  const [saving, setSaving] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Укажите имя");
      return;
    }
    if (normalizePhone(phone).length < 11) {
      setError("Укажите корректный номер телефона");
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setError("Проверьте формат e-mail");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name, phone, email, address });
      setSaved(true);
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-border/60 p-6 md:p-8">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-xl md:text-2xl font-semibold tracking-[-0.01em] text-ink">
          Профиль
        </h2>
        <span className="text-[13px] text-ink-muted">
          С нами с {formatDate(user.createdAt)}
        </span>
      </div>

      <form onSubmit={submit} className="mt-6 max-w-md flex flex-col gap-3" noValidate>
        <ProfileField
          id="profile-name"
          label="Имя"
          autoComplete="name"
          value={name}
          onChange={setName}
        />
        <ProfileField
          id="profile-phone"
          label="Телефон"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={setPhone}
        />
        <ProfileField
          id="profile-email"
          label="E-mail"
          optional
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="вы@почта.ру"
          value={email}
          onChange={setEmail}
        />
        <ProfileField
          id="profile-address"
          label="Адрес доставки"
          optional
          autoComplete="street-address"
          placeholder="Улица, дом, квартира"
          value={address}
          onChange={setAddress}
        />

        {error && (
          <p className="text-[13px] text-sale" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          <button
            type="submit"
            disabled={!dirty || saving}
            className="inline-flex items-center justify-center h-11 px-6 rounded-full bg-ink text-white text-sm font-medium hover:bg-ink/85 disabled:opacity-40 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-emerald-700 font-medium">
              <Check className="size-4" aria-hidden />
              Сохранено
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function ProfileField({
  id,
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  placeholder,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-ink-subtle mb-1.5">
        <span>{label}</span>
        {optional && (
          <span className="normal-case tracking-normal">необязательно</span>
        )}
      </span>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-11 px-4 rounded-xl bg-surface text-[15px] text-ink placeholder:text-ink-subtle outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors"
        )}
      />
    </label>
  );
}
