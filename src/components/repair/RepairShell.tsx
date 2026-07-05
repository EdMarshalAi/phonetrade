"use client";

import * as React from "react";
import Image from "next/image";
import { Wrench, ShieldCheck, BadgeCheck, Clock, Check, Phone, ChevronLeft, ChevronRight, Loader2, Smartphone, HelpCircle, X, Watch } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ymReachGoal } from "@/lib/analytics/metrika";
import { useCookieConsent } from "@/components/legal/CookieConsent";
import { DEVICE_CATEGORIES, issuesFor, deviceImage, type DeviceCategoryKey } from "@/lib/repair/devices";
import { REPAIR_FAQ } from "@/lib/repair/faq";
import { submitRepairRequest } from "@/lib/repair/repair-actions";

const HERO_IMAGE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/repair/hero-broken-iphone.png";
const IPAD_HELP_IMAGE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/repair/ipad-model-help.jpg";

const ADVANTAGES = [
  { icon: BadgeCheck, title: "Только оригинал", text: "Оригинальные запчасти и комплектующие" },
  { icon: ShieldCheck, title: "Гарантия на ремонт", text: "До 12 месяцев на работы и детали" },
  { icon: Clock, title: "В день обращения", text: "Большинство ремонтов — за 1–2 часа" },
];

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

        <div className="container-page relative grid items-center gap-6 py-12 md:gap-10 md:py-20 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-xl lg:pl-2 xl:pl-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white">
              <Wrench className="size-3.5" /> Сервисный центр · Белгород
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl lg:text-6xl">
              <RotatingWord /> ремонт<br className="hidden sm:block" /> iPhone, iPad и Mac
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-muted md:text-base">
              Сервисный центр PhoneTrade в Белгороде чинит технику Apple в день обращения —
              с гарантией и оригинальными запчастями. Большинство ремонтов производим за 1–2 часа.
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

      {/* ── FAQ (видимый; синхронизирован с FAQPage-разметкой в repair/page.tsx) ── */}
      <section className="container-page pb-16 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Частые вопросы о ремонте</h2>
          <div className="mt-6 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-white">
            {REPAIR_FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink">
                  {f.q}
                  <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ── Плитка устройства (фото + подпись) ───────────────────────────────────────
function DeviceTile({ label, image, onClick }: { label: string; image: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-md"
    >
      <span className="flex h-16 w-full items-center justify-center sm:h-20">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={`Ремонт ${label} в Белгороде — замена экрана, аккумулятора, стекла · PhoneTrade`} loading="lazy" className="h-full w-auto object-contain" />
        ) : (
          <Smartphone className="size-8 text-ink-subtle" strokeWidth={1.5} />
        )}
      </span>
      <span className="text-[12px] font-medium leading-tight text-ink sm:text-[12.5px]">{label}</span>
    </button>
  );
}

// ── Пошаговый квиз ───────────────────────────────────────────────────────────
function RepairQuiz({ authed, initialName, initialPhone }: { authed: boolean; initialName?: string; initialPhone?: string }) {
  const { applyAll } = useCookieConsent();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [cat, setCat] = React.useState<DeviceCategoryKey>("iphone");
  const [seriesKey, setSeriesKey] = React.useState<string | null>(null);
  const [device, setDevice] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [comment, setComment] = React.useState("");
  const [name, setName] = React.useState(initialName ?? "");
  const [phone, setPhone] = React.useState(initialPhone ?? "");
  const [marketing, setMarketing] = React.useState(false);
  const [cRules, setCRules] = React.useState(false);
  const [cPd, setCPd] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualValue, setManualValue] = React.useState("");
  const [exactModel, setExactModel] = React.useState("");
  const [sizeModel, setSizeModel] = React.useState<string | null>(null);

  const activeCat = DEVICE_CATEGORIES.find((c) => c.key === cat)!;
  const activeSeries = activeCat.series?.find((s) => s.key === seriesKey) ?? null;
  const catIssues = issuesFor(cat);

  const setCategory = (k: DeviceCategoryKey) => { setCat(k); setSeriesKey(null); setManualOpen(false); setManualValue(""); setExactModel(""); setSizeModel(null); };
  const pickDevice = (d: string) => { setDevice(d); setIssues([]); setStep(2); ymReachGoal("repair_open"); };
  // Apple Watch: у модели несколько размеров → промежуточный шаг выбора размера.
  const pickModel = (m: string) => {
    const sizes = activeCat.sizesByModel?.[m];
    if (sizes && sizes.length > 1) { setSizeModel(m); return; }
    pickDevice(sizes && sizes.length === 1 ? `${m}, ${sizes[0]} мм` : m);
  };
  const toggleIssue = (k: string) => setIssues((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const submit = async () => {
    setError(null);
    if (phone.replace(/\D/g, "").length < 11) { setError("Укажите корректный телефон"); return; }
    if (!name.trim()) { setError("Укажите имя"); return; }
    if (!cRules) { setError("Подтвердите, что ознакомились с правилами ремонтных работ"); return; }
    if (!authed && !cPd) { setError("Необходимо дать согласие на обработку персональных данных"); return; }
    setBusy(true);
    const finalDevice = activeCat.exactModel && exactModel.trim() ? `${device} ${exactModel.trim()}` : device!;
    const res = await submitRepairRequest({ device: finalDevice, category: cat, issues, comment, name, phone, consentMarketing: marketing });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    applyAll(); // дал согласие на ПДн → применяем все cookie (вкл. аналитику)
    ymReachGoal("repair_submit");
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-ink text-white"><Check className="size-7" /></span>
        <h3 className="mt-5 text-xl font-semibold text-ink">Заявка принята!</h3>
        <p className="mt-2 text-[14px] text-ink-muted">Мастер свяжется с вами, уточнит детали и назовёт стоимость ремонта.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">Что у вас сломалось?</h2>
        <p className="mt-2 text-[15px] text-ink-muted">Соберём заявку за минуту — выберите устройство и поломку.</p>
      </div>

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
                <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                  className={cn("inline-flex h-9 items-center rounded-full px-4 text-[13.5px] font-medium transition-colors",
                    cat === c.key ? "bg-ink text-white" : "border border-border bg-white text-ink-muted hover:border-ink/40 hover:text-ink")}>
                  {c.title}
                </button>
              ))}
            </div>

            {activeCat.manual && manualOpen ? (
              <div className="mt-4">
                <button type="button" onClick={() => { setManualOpen(false); setManualValue(""); }} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink">
                  <ChevronLeft className="size-4" /> Назад к моделям
                </button>
                {activeCat.manual.image ? (
                  <div className="mb-3 overflow-hidden rounded-2xl border border-border/60 bg-surface">
                    <Image src={activeCat.manual.image} alt="Где найти модель MacBook на крышке" width={640} height={640} className="mx-auto h-auto w-full max-w-sm object-contain" />
                  </div>
                ) : null}
                <p className="mb-2 text-[13.5px] font-medium text-ink">{activeCat.manual.hint}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="Например, MacBook Pro A1502" className="h-11 flex-1 rounded-xl border border-border bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
                  <button type="button" disabled={!manualValue.trim()} onClick={() => pickDevice(manualValue.trim())} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[14px] font-medium text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50">Далее <ChevronRight className="size-4" /></button>
                </div>
              </div>
            ) : sizeModel ? (
              <div className="mt-4">
                <button type="button" onClick={() => setSizeModel(null)} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink">
                  <ChevronLeft className="size-4" /> Назад к моделям
                </button>
                <p className="mb-2 text-[12.5px] text-ink-subtle">Выберите размер корпуса · <span className="font-medium text-ink">{sizeModel}</span></p>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                  {(activeCat.sizesByModel?.[sizeModel] ?? []).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => pickDevice(`${sizeModel}, ${sz} мм`)}
                      className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-md"
                    >
                      <span className="flex h-12 w-full items-center justify-center sm:h-14">
                        <Watch className="size-7 text-ink-subtle transition-colors group-hover:text-ink" strokeWidth={1.5} />
                      </span>
                      <span className="text-[13px] font-semibold text-ink">{sz} мм</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
            {activeCat.series ? (
              activeSeries ? (
                <div className="mt-4">
                  <button type="button" onClick={() => setSeriesKey(null)} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:text-ink">
                    <ChevronLeft className="size-4" /> Все серии iPhone
                  </button>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                    {activeSeries.models.map((m) => <DeviceTile key={m} label={m} image={deviceImage(m)} onClick={() => pickDevice(m)} />)}
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="mb-2 text-[12.5px] text-ink-subtle">Выберите серию iPhone:</p>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                    {activeCat.series.map((s) => <DeviceTile key={s.key} label={s.title} image={deviceImage(s.cover)} onClick={() => setSeriesKey(s.key)} />)}
                  </div>
                </div>
              )
            ) : activeCat.groups ? (
              <div className="mt-4">
                <div className="mb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setHelpOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-ink/40 hover:text-ink"
                  >
                    <HelpCircle className="size-4" /> Помочь определить модель
                  </button>
                </div>
                <div className="space-y-5">
                  {activeCat.groups.map((g) => (
                    <div key={g.title}>
                      <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-ink-subtle">{g.title}</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {g.models.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => pickDevice(m)}
                            className="rounded-xl border border-border/70 bg-white px-3 py-2.5 text-center text-[12.5px] font-medium text-ink transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-sm"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
                {(activeCat.models ?? []).map((m) => <DeviceTile key={m} label={m} image={deviceImage(m)} onClick={() => pickModel(m)} />)}
                {activeCat.manual ? (
                  <button
                    type="button"
                    onClick={() => setManualOpen(true)}
                    className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-md"
                  >
                    <span className="flex h-16 w-full items-center justify-center sm:h-20">
                      <HelpCircle className="size-8 text-ink-subtle transition-colors group-hover:text-ink" strokeWidth={1.5} />
                    </span>
                    <span className="text-[12px] font-medium leading-tight text-ink sm:text-[12.5px]">{activeCat.manual.label}</span>
                  </button>
                ) : null}
              </div>
            )}
              </>
            )}
          </div>
        ) : null}

        {/* Шаг 2 — поломка */}
        {step === 2 ? (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-ink-subtle">Шаг 2 · Что чинить</p>
              <span className="truncate rounded-full bg-surface px-3 py-1 text-[12px] font-medium text-ink">{device}</span>
            </div>
            {activeCat.exactModel ? (
              <label className="mt-3 block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink">{activeCat.exactModel.label}</span>
                <input value={exactModel} onChange={(e) => setExactModel(e.target.value)} placeholder={activeCat.exactModel.placeholder}
                  className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
              </label>
            ) : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {catIssues.map((it) => {
                const on = issues.includes(it.key);
                return (
                  <button key={it.key} type="button" onClick={() => toggleIssue(it.key)}
                    className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13.5px] transition-colors",
                      on ? "border-ink bg-ink/[0.04] text-ink" : "border-border bg-white text-ink-muted hover:border-ink/40")}>
                    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-[5px] border", on ? "border-ink bg-ink text-white" : "border-border")}>{on ? <Check className="size-3" /> : null}</span>
                    <span className="flex-1">{it.label}</span>
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
          <div className="mx-auto max-w-xl">
            <p className="text-[13px] font-medium text-ink-subtle">Шаг 3 · Контакты</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+7 (___) ___-__-__" className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
            </div>

            <div className="mt-4 space-y-2.5">
              <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
                <input type="checkbox" checked={cRules} onChange={(e) => setCRules(e.target.checked)} className="mt-0.5 size-4" />
                <span>Ознакомлен(а) с <a href="/service-rules" target="_blank" className="text-ink underline">правилами ремонтных работ</a></span>
              </label>
              {!authed ? (
                <>
                  <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
                    <input type="checkbox" checked={cPd} onChange={(e) => setCPd(e.target.checked)} className="mt-0.5 size-4" />
                    <span>Даю <a href="/consent" target="_blank" className="text-ink underline">согласие на обработку персональных данных</a></span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-4" />
                    <span>Хочу получать акции и новинки (необязательно)</span>
                  </label>
                </>
              ) : null}
            </div>

            {error ? <p className="mt-3 rounded-lg border border-sale/25 bg-sale/5 px-3 py-2 text-[13px] text-sale">{error}</p> : null}

            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(2)} className="inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-medium text-ink-muted hover:text-ink"><ChevronLeft className="size-4" /> Назад</button>
              <button type="button" onClick={submit} disabled={busy || !cRules || (!authed && !cPd)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-8 text-[15px] font-medium text-white transition-colors hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? <Loader2 className="size-5 animate-spin" /> : <Phone className="size-[18px]" />} Оставить заявку
              </button>
            </div>
            {!authed ? (
              <p className="mt-3 text-[12px] leading-snug text-ink-subtle">
                Нажимая «Оставить заявку», вы принимаете условия{" "}
                <a href="/offer" target="_blank" className="underline underline-offset-2 hover:text-ink">оферты</a> и{" "}
                <a href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-ink">политики конфиденциальности</a>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Модалка-подсказка: как определить модель iPad */}
      {helpOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setHelpOpen(false)} aria-hidden />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-border/60 bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[17px] font-semibold text-ink">Как определить модель iPad</h3>
              <button type="button" onClick={() => setHelpOpen(false)} aria-label="Закрыть" className="rounded-full p-1.5 text-ink-subtle transition-colors hover:bg-surface hover:text-ink">
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
              При обращении уточните модель — она указана на обратной стороне iPad в нижней части, по типу <span className="font-semibold text-ink">A1584</span>.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border/60 bg-surface">
              <Image src={IPAD_HELP_IMAGE} alt="Номер модели (A-номер) на задней крышке iPad" width={960} height={680} className="h-auto w-full object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
