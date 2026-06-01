"use client";

import * as React from "react";
import Image from "next/image";
import { Wrench, ShieldCheck, BadgeCheck, Clock, Check, Phone, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ymReachGoal } from "@/lib/analytics/metrika";
import { DEVICE_CATEGORIES, issuesFor, type DeviceCategoryKey } from "@/lib/repair/devices";
import { submitRepairRequest } from "@/lib/repair/repair-actions";

const HERO_IMAGE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/repair/hero-broken-iphone.png";

const ADVANTAGES = [
  { icon: BadgeCheck, title: "Только оригинал", text: "Оригинальные запчасти и комплектующие" },
  { icon: ShieldCheck, title: "Гарантия на ремонт", text: "До 12 месяцев на работы и детали" },
  { icon: Clock, title: "В день обращения", text: "Большинство работ — от 20 минут" },
];

// Чередующееся слово вместо клише «Гарантийный».
const WORDS = ["Быстрый", "Честный", "Выгодный", "Надёжный", "Качественный"];

function RotatingWord() {
  const [i, setI] = React.useState(0);
  const [show, setShow] = React.useState(true);
  React.useEffect(() => {
    const t = setInterval(() => {
      setShow(false);
      setTimeout(() => { setI((v) => (v + 1) % WORDS.length); setShow(true); }, 220);
    }, 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      className={cn("inline-block transition-all duration-300", show ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0")}
      style={{ backgroundImage: "linear-gradient(90deg,#ec4899,#8b5cf6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
    >
      {WORDS[i]}
    </span>
  );
}

export function RepairShell({ initialPhone, initialName, authed }: { initialPhone?: string; initialName?: string; authed?: boolean }) {
  const scrollToQuiz = () => document.getElementById("repair-quiz")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-28 size-[440px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(244,114,182,0.40), transparent 70%)" }} />
          <div className="absolute right-24 top-8 size-[300px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(167,139,250,0.38), transparent 70%)" }} />
          <div className="absolute -bottom-28 -left-20 size-[360px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(96,165,250,0.30), transparent 70%)" }} />
          <div className="absolute bottom-0 left-1/3 size-[280px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(251,146,160,0.28), transparent 70%)" }} />
        </div>

        <div className="container-page relative grid items-center gap-6 py-10 md:gap-8 md:py-14 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white">
              <Wrench className="size-3.5" /> Сервисный центр · Белгород
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              <RotatingWord /> ремонт<br className="hidden sm:block" /> iPhone, iPad и Mac
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-muted">
              Сервисный центр PhoneTrade в Белгороде чинит технику Apple в день обращения —
              с гарантией и оригинальными запчастями. Бесплатная диагностика.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToQuiz}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-white transition-colors hover:bg-ink/85"
              >
                <Wrench className="size-[18px]" /> Узнать стоимость ремонта
              </button>
              <span className="text-[13px] text-ink-subtle">Узнайте за одну минуту</span>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {ADVANTAGES.map((a) => (
                <div key={a.title} className="rounded-2xl border border-border/60 bg-white/70 p-4 backdrop-blur-sm">
                  <a.icon className="size-5 text-ink" strokeWidth={1.75} />
                  <p className="mt-2.5 text-[14px] font-semibold text-ink">{a.title}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">{a.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px]">
            <Image
              src={HERO_IMAGE}
              alt="Ремонт iPhone с разбитым экраном в Белгороде — сервисный центр PhoneTrade"
              width={420}
              height={500}
              priority
              className="mx-auto h-auto w-full object-contain drop-shadow-2xl"
              style={{ animation: "floatSoft 5s ease-in-out infinite" }}
            />
          </div>
        </div>
      </section>

      {/* ── Квиз ── */}
      <section id="repair-quiz" className="container-page py-14 md:py-20">
        <RepairQuiz authed={!!authed} initialName={initialName} initialPhone={initialPhone} />
      </section>
    </>
  );
}

// ── Пошаговый квиз ───────────────────────────────────────────────────────────
function RepairQuiz({ authed, initialName, initialPhone }: { authed: boolean; initialName?: string; initialPhone?: string }) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [cat, setCat] = React.useState<DeviceCategoryKey>("iphone");
  const [device, setDevice] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [comment, setComment] = React.useState("");
  const [name, setName] = React.useState(initialName ?? "");
  const [phone, setPhone] = React.useState(initialPhone ?? "");
  const [marketing, setMarketing] = React.useState(false);
  const [cOffer, setCOffer] = React.useState(false);
  const [cPd, setCPd] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const activeCat = DEVICE_CATEGORIES.find((c) => c.key === cat)!;
  const catIssues = issuesFor(cat);

  const pickDevice = (d: string) => {
    setDevice(d);
    setIssues([]);
    setStep(2);
    ymReachGoal("repair_open");
  };
  const toggleIssue = (k: string) => setIssues((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const submit = async () => {
    setError(null);
    if (phone.replace(/\D/g, "").length < 11) { setError("Укажите корректный телефон"); return; }
    if (!name.trim()) { setError("Укажите имя"); return; }
    if (!authed && (!cOffer || !cPd)) { setError("Подтвердите согласия, чтобы отправить заявку"); return; }
    setBusy(true);
    const res = await submitRepairRequest({ device: device!, category: cat, issues, comment, name, phone, consentMarketing: marketing });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    ymReachGoal("repair_submit");
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-ink text-white"><Check className="size-7" /></span>
        <h3 className="mt-5 text-xl font-semibold text-ink">Заявка принята!</h3>
        <p className="mt-2 text-[14px] text-ink-muted">Мастер свяжется с вами, уточнит детали и назовёт стоимость. Диагностика — бесплатно.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Что у вас сломалось?</h2>
        <p className="mt-2 text-[15px] text-ink-muted">Соберём заявку за минуту — выберите устройство и поломку.</p>
      </div>

      {/* Прогресс */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <span key={s} className={cn("h-1.5 rounded-full transition-all", s === step ? "w-8 bg-ink" : s < step ? "w-6 bg-ink/40" : "w-6 bg-border")} />
        ))}
      </div>

      <div className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-7">
        {/* Шаг 1 — устройство */}
        {step === 1 ? (
          <div>
            <p className="text-[13px] font-medium text-ink-subtle">Шаг 1 · Устройство</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEVICE_CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => setCat(c.key)}
                  className={cn("inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-medium transition-colors",
                    cat === c.key ? "bg-ink text-white" : "border border-border bg-white text-ink-muted hover:border-ink/40 hover:text-ink")}>
                  {c.title}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {activeCat.models.map((m) => (
                <button key={m} type="button" onClick={() => pickDevice(m)}
                  className="group flex min-h-12 items-center justify-between gap-2 rounded-xl border border-border/70 bg-white px-3.5 py-3 text-left text-[13.5px] font-medium text-ink transition-colors hover:border-ink hover:bg-surface">
                  <span className="leading-tight">{m}</span>
                  <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Шаг 2 — поломка */}
        {step === 2 ? (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-ink-subtle">Шаг 2 · Что чинить</p>
              <span className="truncate rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-ink">{device}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {catIssues.map((it) => {
                const on = issues.includes(it.key);
                return (
                  <button key={it.key} type="button" onClick={() => toggleIssue(it.key)}
                    className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13.5px] transition-colors",
                      on ? "border-ink bg-ink/[0.04] text-ink" : "border-border bg-white text-ink-muted hover:border-ink/40")}>
                    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-[5px] border", on ? "border-ink bg-ink text-white" : "border-border")}>{on ? <Check className="size-3" /> : null}</span>
                    <span className="flex-1">{it.label}</span>
                    {it.free ? <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-subtle">бесплатно</span> : null}
                  </button>
                );
              })}
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Опишите проблему подробнее (необязательно)" maxLength={500}
              className="mt-4 min-h-[64px] w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(1)} className="inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-medium text-ink-muted hover:text-ink"><ChevronLeft className="size-4" /> Назад</button>
              <button type="button" onClick={() => { if (!issues.length && !comment.trim()) { setError("Выберите, что нужно починить"); return; } setError(null); setStep(3); }}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-7 text-[14px] font-medium text-white hover:bg-ink/85">Далее <ChevronRight className="size-4" /></button>
            </div>
            {error ? <p className="mt-3 text-center text-[13px] text-sale">{error}</p> : null}
          </div>
        ) : null}

        {/* Шаг 3 — контакты + согласия */}
        {step === 3 ? (
          <div>
            <p className="text-[13px] font-medium text-ink-subtle">Шаг 3 · Контакты</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+7 (___) ___-__-__" className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
            </div>

            {!authed ? (
              <div className="mt-4 space-y-2.5">
                <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
                  <input type="checkbox" checked={cOffer} onChange={(e) => setCOffer(e.target.checked)} className="mt-0.5 size-4" />
                  <span>Принимаю <a href="/offer" target="_blank" className="text-ink underline">оферту</a> и <a href="/privacy" target="_blank" className="text-ink underline">политику конфиденциальности</a></span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
                  <input type="checkbox" checked={cPd} onChange={(e) => setCPd(e.target.checked)} className="mt-0.5 size-4" />
                  <span>Даю <a href="/consent" target="_blank" className="text-ink underline">согласие на обработку персональных данных</a></span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-4" />
                  <span>Хочу получать акции и выгодные предложения (необязательно)</span>
                </label>
              </div>
            ) : null}

            {error ? <p className="mt-3 rounded-lg border border-sale/25 bg-sale/5 px-3 py-2 text-[13px] text-sale">{error}</p> : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(2)} className="inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-medium text-ink-muted hover:text-ink"><ChevronLeft className="size-4" /> Назад</button>
              <button type="button" onClick={submit} disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-8 text-[15px] font-medium text-white transition-colors hover:bg-ink/85 disabled:opacity-60">
                {busy ? <Loader2 className="size-5 animate-spin" /> : <Phone className="size-[18px]" />} Оставить заявку
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
