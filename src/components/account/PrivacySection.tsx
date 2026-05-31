"use client";

import * as React from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { submitDataRequest } from "@/lib/legal/dsr-actions";
import { DSR_TYPES, type DsrType } from "@/lib/legal/dsr";
import { cn } from "@/lib/utils/cn";

const TYPE_ORDER: DsrType[] = ["access", "rectify", "delete", "revoke", "export"];

export function PrivacySection() {
  const { user } = useAuth();
  const [type, setType] = React.useState<DsrType>("access");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  // Подставляем данные профиля один раз.
  const prefilled = React.useRef(false);
  React.useEffect(() => {
    if (prefilled.current || !user) return;
    prefilled.current = true;
    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
  }, [user]);

  const submit = () => {
    setError(null);
    if (!email.trim() && !phone.trim()) {
      setError("Укажите телефон или email для связи");
      return;
    }
    setPending(true);
    submitDataRequest({ requestType: type, name, email, phone, details })
      .then((r) => {
        setPending(false);
        if (r.error) {
          setError(r.error);
          return;
        }
        setDone(true);
      })
      .catch(() => {
        setPending(false);
        setError("Не удалось отправить обращение. Проверьте соединение.");
      });
  };

  if (done) {
    return (
      <div className="rounded-3xl bg-white border border-border/60 p-8 md:p-10 text-center">
        <span aria-hidden className="inline-flex size-14 items-center justify-center rounded-full bg-ink text-white mb-5">
          <Check className="size-7" />
        </span>
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Обращение принято</h2>
        <p className="mt-3 text-[15px] text-ink-muted leading-relaxed max-w-md mx-auto">
          Мы рассмотрим запрос и ответим на указанный контакт в течение 30 дней —
          в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(false);
            setDetails("");
          }}
          className="mt-7 inline-flex items-center h-11 px-6 rounded-full border border-border text-ink text-sm font-medium hover:border-ink/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          Отправить ещё одно
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl bg-white border border-border/60 p-6 md:p-8">
        <div className="flex items-start gap-3 mb-6">
          <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Ваши данные и согласия</h2>
            <p className="mt-1 text-[13px] text-ink-muted leading-relaxed">
              Вы вправе запросить доступ к своим персональным данным, их изменение,
              удаление, отозвать согласие на обработку или получить выгрузку. Подробнее —
              в{" "}
              <a href="/privacy" className="text-ink underline underline-offset-2">политике конфиденциальности</a>{" "}
              и{" "}
              <a href="/consent" className="text-ink underline underline-offset-2">согласии на обработку ПД</a>.
            </p>
          </div>
        </div>

        <fieldset className="mb-5">
          <legend className="text-[13px] font-medium text-ink mb-2.5">Тип обращения</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPE_ORDER.map((t) => (
              <label
                key={t}
                className={cn(
                  "flex items-center gap-2.5 h-11 px-3.5 rounded-xl border text-sm cursor-pointer transition-colors",
                  type === t
                    ? "border-ink bg-surface text-ink"
                    : "border-border/70 text-ink-muted hover:border-ink/40"
                )}
              >
                <input
                  type="radio"
                  name="dsr-type"
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="size-4 accent-[var(--color-ink)]"
                />
                {DSR_TYPES[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Имя" value={name} onChange={setName} placeholder="Как к вам обращаться" />
          <Field label="Телефон" value={phone} onChange={setPhone} placeholder="+7 …" type="tel" />
          <div className="sm:col-span-2">
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[13px] font-medium text-ink mb-1.5">Комментарий (необязательно)</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Уточните запрос, если нужно"
              className="w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors resize-y"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-[13px] text-sale" role="alert">{error}</p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-5 inline-flex items-center justify-center h-12 px-7 rounded-2xl bg-ink text-white text-sm font-medium hover:bg-ink/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Отправляем…" : "Отправить обращение"}
        </button>
        <p className="mt-3 text-[12px] text-ink-subtle leading-relaxed">
          Срок рассмотрения — 30 дней (ст. 20 Федерального закона № 152-ФЗ).
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-ink mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl bg-surface px-3.5 text-sm text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/15 transition-colors"
      />
    </div>
  );
}
