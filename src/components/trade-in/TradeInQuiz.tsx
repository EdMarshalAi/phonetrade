"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, RotateCcw } from "lucide-react";
import { submitTradeInQuiz } from "@/lib/trade-in/trade-in-actions";
import { EXTERNAL_OPTIONS, BATTERY_OPTIONS, KIT_OPTIONS, type TradeInModel } from "@/lib/trade-in/options";
import { useAuth, type AuthUser } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

const STEP_TITLES = [
  "Какая у вас модель?",
  "Какой объём памяти?",
  "Внешний вид",
  "Состояние аккумулятора",
  "Серьёзные поломки",
  "Привязан ли Apple ID (iCloud)?",
  "Что входит в комплект?",
  "Готово! Узнайте вашу цену",
];
const TOTAL = STEP_TITLES.length;

type Data = {
  modelKey: string; modelTitle: string; memoryGb: number;
  external: string; battery: string; hasBreakage: boolean | null; breakageDescription: string;
  icloud: string; kit: string; name: string; phone: string; email: string;
};

const EMPTY: Data = {
  modelKey: "", modelTitle: "", memoryGb: 0, external: "", battery: "", hasBreakage: null,
  breakageDescription: "", icloud: "", kit: "", name: "", phone: "+7 ", email: "",
};

export function TradeInQuiz({ models, initialUser = null }: { models: TradeInModel[]; initialUser?: AuthUser | null }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { user: clientUser, updateProfile } = useAuth();
  // Сервер уже знает об авторизации (cookie-сессия) — используем сразу, не дожидаясь
  // клиентского getSession(). Иначе авторизованному показывалась бы гостевая форма с телефоном.
  const user = clientUser ?? initialUser;
  const [step, setStep] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [d, setD] = React.useState<Data>(EMPTY);
  const [consent, setConsent] = React.useState({ oferta: false, pd: false, marketing: false });
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rejected, setRejected] = React.useState(false);

  const set = (patch: Partial<Data>) => setD((s) => ({ ...s, ...patch }));

  // Авторизованный пользователь — подставляем контакты из профиля. Заполняем
  // ТОЛЬКО пустые/дефолтные поля, поэтому эффект безопасно перезапускать при
  // позднем появлении user (не затирает то, что ввёл пользователь руками).
  React.useEffect(() => {
    if (!user) return;
    setD((s) => ({
      ...s,
      name: s.name.trim() ? s.name : user.name || s.name,
      phone: (!s.phone || s.phone.trim() === "+7") && user.phone ? user.phone : s.phone,
      email: s.email.trim() ? s.email : user.email || s.email,
    }));
  }, [user]);
  const selectedModel = models.find((m) => m.model_key === d.modelKey);

  // Автопереход на следующий шаг после выбора (если остались на этом же шаге).
  const autoNext = React.useCallback((fromStep: number) => {
    window.setTimeout(() => {
      setDir(1);
      setStep((c) => (c === fromStep && c < TOTAL - 1 ? c + 1 : c));
      setError(null);
    }, 260);
  }, []);

  const nameOk = d.name.trim().length > 0;
  const phoneOk = d.phone.replace(/\D/g, "").length >= 11;

  const canProceed = (() => {
    switch (step) {
      case 0: return !!d.modelKey;
      case 1: return d.memoryGb > 0;
      case 2: return !!d.external;
      case 3: return !!d.battery;
      case 4: return d.hasBreakage === false || (d.hasBreakage === true && d.breakageDescription.trim().length > 0);
      case 5: return !!d.icloud;
      case 6: return !!d.kit;
      case 7: return nameOk && phoneOk && (!!user || (consent.oferta && consent.pd));
      default: return false;
    }
  })();

  const go = (n: number) => { setDir(n > step ? 1 : -1); setStep(n); setError(null); };
  const next = () => {
    if (!canProceed) return;
    if (step === 5 && d.icloud === "linked") { setRejected(true); return; }
    if (step < TOTAL - 1) go(step + 1); else submit();
  };
  const back = () => { if (step > 0) go(step - 1); };
  const restart = () => { setD(EMPTY); setConsent({ oferta: false, pd: false, marketing: false }); setRejected(false); setStep(0); setError(null); };

  const submit = async () => {
    setPending(true); setError(null);
    const res = await submitTradeInQuiz({
      modelKey: d.modelKey, modelTitle: d.modelTitle, memoryGb: d.memoryGb,
      external: d.external, battery: d.battery, hasBreakage: !!d.hasBreakage,
      breakageDescription: d.breakageDescription, icloud: d.icloud, kit: d.kit,
      name: d.name, phone: d.phone, email: d.email || undefined, consentMarketing: consent.marketing,
    });
    if (res.error) { setPending(false); setError(res.error); return; }
    // Авторизованный ввёл недостающие контакты — сохраним в профиль (без блокировки перехода).
    if (user) {
      const patch: { name?: string; phone?: string } = {};
      if (d.name.trim() && d.name.trim() !== (user.name || "").trim()) patch.name = d.name.trim();
      if (d.phone.trim() && d.phone.trim() !== (user.phone || "").trim()) patch.phone = d.phone.trim();
      if (patch.name || patch.phone) updateProfile(patch).catch(() => {});
    }
    router.push(`/trade-in/thank-you?lead=${encodeURIComponent(res.leadNumber || "")}`);
  };

  if (rejected) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-border/60 bg-white p-8 text-center md:p-10">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Мы не принимаем устройства с привязанным Apple ID</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
          Перед сдачей отвяжите Apple ID: Настройки → ваше имя → прокрутите вниз → «Выйти». Введите пароль и подтвердите. Затем вернитесь и пройдите оценку заново.
        </p>
        <button onClick={restart} className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-sm font-medium text-white transition-colors hover:bg-ink/85">
          <RotateCcw className="size-4" /> Начать заново
        </button>
      </div>
    );
  }

  const slide = reduce ? {} : {
    initial: { opacity: 0, x: dir * 36 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: dir * -36 },
    transition: { duration: 0.26, ease: [0.32, 0.72, 0, 1] as const },
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Прогресс */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-[13px] text-ink-muted">
          <span>Шаг {step + 1} из {TOTAL}</span>
          <span>{Math.round(((step + 1) / TOTAL) * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
          <motion.div className="h-full rounded-full bg-ink" initial={false} animate={{ width: `${((step + 1) / TOTAL) * 100}%` }} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} />
        </div>
      </div>

      <div className="min-h-[300px]">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} {...slide}>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">{STEP_TITLES[step]}</h2>

            {/* Шаг 1 — модель (кастомный выпадающий список) */}
            {step === 0 && (
              <div className="mt-6">
                <ModelDropdown
                  models={models}
                  value={d.modelKey}
                  onSelect={(m) => { set({ modelKey: m.model_key, modelTitle: m.model_title, memoryGb: 0 }); autoNext(0); }}
                />
                {models.length === 0 && <p className="mt-3 text-ink-muted">Список моделей пуст — позвоните нам: +7 (904) 098-88-77</p>}
              </div>
            )}

            {/* Шаг 2 — память */}
            {step === 1 && (
              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {(selectedModel?.memories ?? []).map((mem) => (
                  <Tile key={mem.memory_gb} selected={d.memoryGb === mem.memory_gb} onClick={() => { set({ memoryGb: mem.memory_gb }); autoNext(1); }} title={mem.memory_gb >= 1024 ? "1 TB" : `${mem.memory_gb} GB`} />
                ))}
              </div>
            )}

            {/* Шаг 3 — внешний вид */}
            {step === 2 && (
              <div className="mt-6 flex flex-col gap-2.5">
                {EXTERNAL_OPTIONS.map((o) => (
                  <RadioCard key={o.value} selected={d.external === o.value} onClick={() => { set({ external: o.value }); autoNext(2); }} title={o.label} hint={o.hint} />
                ))}
              </div>
            )}

            {/* Шаг 4 — аккумулятор */}
            {step === 3 && (
              <div className="mt-6">
                <p className="mb-4 rounded-xl bg-surface px-4 py-3 text-[13px] text-ink-muted">📍 Узнать можно в «Настройки → Аккумулятор → Состояние аккумулятора»</p>
                <div className="flex flex-col gap-2.5">
                  {BATTERY_OPTIONS.map((o) => (
                    <RadioCard key={o.value} selected={d.battery === o.value} onClick={() => { set({ battery: o.value }); autoNext(3); }} title={o.label} hint={o.hint} />
                  ))}
                </div>
              </div>
            )}

            {/* Шаг 5 — поломки */}
            {step === 4 && (
              <div className="mt-6 flex flex-col gap-2.5">
                <RadioCard selected={d.hasBreakage === false} onClick={() => { set({ hasBreakage: false }); autoNext(4); }} title="Всё работает исправно" />
                <RadioCard selected={d.hasBreakage === true} onClick={() => set({ hasBreakage: true })} title="Есть поломки" hint="Камера, экран, кнопки, динамики и т.п." />
                {d.hasBreakage === true && (
                  <textarea value={d.breakageDescription} maxLength={300} onChange={(e) => set({ breakageDescription: e.target.value })} placeholder="Опишите, что именно не работает" className="mt-1 w-full rounded-xl bg-surface px-4 py-3 text-[15px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/15" rows={3} />
                )}
                <p className="text-[12px] text-ink-subtle">При серьёзных поломках цена может быть ниже, точная сумма — при осмотре.</p>
              </div>
            )}

            {/* Шаг 6 — iCloud */}
            {step === 5 && (
              <div className="mt-6">
                <p className="mb-4 rounded-xl bg-surface px-4 py-3 text-[13px] text-ink-muted">📍 Перед сдачей нужно выйти из Apple ID: «Настройки → ваше имя → Выйти»</p>
                <div className="flex flex-col gap-2.5">
                  <RadioCard selected={d.icloud === "unlinked"} onClick={() => { set({ icloud: "unlinked" }); autoNext(5); }} title="Apple ID отвязан" />
                  <RadioCard selected={d.icloud === "linked"} onClick={() => { set({ icloud: "linked" }); window.setTimeout(() => setRejected(true), 260); }} title="Apple ID привязан" hint="Такие устройства мы не принимаем" />
                </div>
              </div>
            )}

            {/* Шаг 7 — комплект */}
            {step === 6 && (
              <div className="mt-6 flex flex-col gap-2.5">
                {KIT_OPTIONS.map((o) => (
                  <RadioCard key={o.value} selected={d.kit === o.value} onClick={() => { set({ kit: o.value }); autoNext(6); }} title={o.label} hint={o.hint} />
                ))}
              </div>
            )}

            {/* Шаг 8 — контакты */}
            {step === 7 && (
              user ? (
                <div className="mt-6 space-y-4">
                  <div className="space-y-3 rounded-2xl border border-border/60 bg-surface/60 p-4">
                    <p className="text-[13px] text-ink-muted">Заявка будет оформлена на ваш аккаунт</p>
                    {nameOk ? (
                      <p className="text-[15px] font-semibold text-ink">{d.name || user.name}</p>
                    ) : (
                      <input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ваше имя" className="h-12 w-full rounded-xl bg-white px-4 text-[15px] text-ink outline-none ring-1 ring-border/60 focus:ring-2 focus:ring-ink/15" />
                    )}
                    {phoneOk ? (
                      <p className="text-[14px] text-ink-muted">{d.phone || user.phone}</p>
                    ) : (
                      <input value={d.phone} onChange={(e) => set({ phone: e.target.value })} type="tel" inputMode="tel" placeholder="+7 ___ ___-__-__" className="h-12 w-full rounded-xl bg-white px-4 text-[15px] text-ink outline-none ring-1 ring-border/60 focus:ring-2 focus:ring-ink/15" />
                    )}
                  </div>
                  <p className="text-[13px] text-ink-subtle">
                    {nameOk && phoneOk
                      ? "Нажмите «Узнать цену» — покажем предварительную стоимость и заявка появится в личном кабинете."
                      : "Укажите контакт для связи — мы сохраним его в вашем профиле."}
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <p className="text-[15px] text-ink-muted">Оставьте контакты — покажем предварительную цену и менеджер свяжется для оценки.</p>
                  <input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Имя" className="h-12 w-full rounded-xl bg-surface px-4 text-[15px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/15" />
                  <input value={d.phone} onChange={(e) => set({ phone: e.target.value })} type="tel" inputMode="tel" placeholder="+7 ___ ___-__-__" className="h-12 w-full rounded-xl bg-surface px-4 text-[15px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/15" />
                  <input value={d.email} onChange={(e) => set({ email: e.target.value })} type="email" inputMode="email" placeholder="E-mail (необязательно)" className="h-12 w-full rounded-xl bg-surface px-4 text-[15px] text-ink outline-none focus:bg-white focus:ring-2 focus:ring-ink/15" />
                  <div className="space-y-2 pt-1">
                    <Consent checked={consent.oferta} onChange={(v) => setConsent((c) => ({ ...c, oferta: v }))}>
                      Принимаю <a href="/offer" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">оферту</a> и <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">политику конфиденциальности</a>
                    </Consent>
                    <Consent checked={consent.pd} onChange={(v) => setConsent((c) => ({ ...c, pd: v }))}>
                      Даю <a href="/consent" target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">согласие на обработку персональных данных</a>
                    </Consent>
                    <Consent checked={consent.marketing} onChange={(v) => setConsent((c) => ({ ...c, marketing: v }))} subtle>
                      Хочу получать акции и новинки (необязательно)
                    </Consent>
                  </div>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {error && <p className="mt-4 text-[13px] text-sale" role="alert">{error}</p>}

      {/* Навигация */}
      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button onClick={back} className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium text-ink transition-colors hover:border-ink/40">
            <ArrowLeft className="size-4" /> Назад
          </button>
        ) : <span />}
        {(step === 4 || step === 7) ? (
          <button onClick={next} disabled={!canProceed || pending} className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-sm font-medium text-white transition-colors hover:bg-ink/85 disabled:opacity-40 disabled:cursor-not-allowed">
            {pending ? "Считаем…" : step === TOTAL - 1 ? "Узнать цену" : "Далее"}
            {!pending && step < TOTAL - 1 && <ArrowRight className="size-4" />}
          </button>
        ) : (
          <span className="text-[13px] text-ink-subtle">Выберите вариант, чтобы продолжить</span>
        )}
      </div>
    </div>
  );
}

function ModelDropdown({ models, value, onSelect }: { models: TradeInModel[]; value: string; onSelect: (m: TradeInModel) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const selected = models.find((m) => m.model_key === value);
  return (
    <div ref={ref} className="relative">
      <button
        type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={cn("flex h-14 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-[16px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink/15", open ? "border-ink/40" : "border-border hover:border-ink/30")}
      >
        <span className={selected ? "text-ink" : "text-ink-subtle"}>{selected ? selected.model_title : "Выберите модель iPhone…"}</span>
        <ChevronDown className={cn("size-5 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border bg-white p-1.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25)]">
          {models.map((m) => (
            <button
              key={m.model_key} type="button" onClick={() => { onSelect(m); setOpen(false); }}
              className={cn("flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] transition-colors hover:bg-surface", value === m.model_key ? "bg-surface font-semibold text-ink" : "text-ink")}
            >
              {m.model_title}
              {value === m.model_key && <Check className="size-4 text-ink" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ selected, onClick, title }: { selected: boolean; onClick: () => void; title: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex min-h-[60px] items-center justify-center rounded-2xl border px-3 py-3 text-center text-[15px] font-medium transition-all", selected ? "border-ink bg-surface text-ink ring-1 ring-ink" : "border-border/70 bg-white text-ink hover:-translate-y-0.5 hover:border-ink/40")}>
      {title}
    </button>
  );
}

function RadioCard({ selected, onClick, title, hint }: { selected: boolean; onClick: () => void; title: string; hint?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all", selected ? "border-ink bg-surface ring-1 ring-ink" : "border-border/70 bg-white hover:border-ink/40")}>
      <span className={cn("inline-flex size-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-ink bg-ink text-white" : "border-border")}>
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-ink">{title}</span>
        {hint && <span className="block text-[12.5px] text-ink-muted">{hint}</span>}
      </span>
    </button>
  );
}

function Consent({ checked, onChange, children, subtle }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; subtle?: boolean }) {
  return (
    <label className={cn("flex items-start gap-2.5 text-[12.5px] leading-snug cursor-pointer", subtle ? "text-ink-subtle" : "text-ink-muted")}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-ink)]" />
      <span>{children}</span>
    </label>
  );
}
