"use client";

import * as React from "react";
import Image from "next/image";
import { Wrench, ShieldCheck, BadgeCheck, Clock, Check, X, Phone, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ymReachGoal } from "@/lib/analytics/metrika";
import { DEVICE_CATEGORIES, REPAIR_ISSUES, type DeviceCategoryKey } from "@/lib/repair/devices";
import { submitRepairRequest } from "@/lib/repair/repair-actions";

const HERO_IMAGE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/repair/hero-broken-iphone.png";

const ADVANTAGES = [
  { icon: BadgeCheck, title: "Только оригинал", text: "Оригинальные запчасти и комплектующие" },
  { icon: ShieldCheck, title: "Гарантия на ремонт", text: "До 12 месяцев на работы и детали" },
  { icon: Clock, title: "В день обращения", text: "Большинство работ — от 20 минут" },
];

export function RepairShell({ initialPhone, initialName }: { initialPhone?: string; initialName?: string }) {
  const [cat, setCat] = React.useState<DeviceCategoryKey>("iphone");
  const [modalDevice, setModalDevice] = React.useState<string | null>(null);
  const [modalCategory, setModalCategory] = React.useState<DeviceCategoryKey>("iphone");

  const openDevice = (device: string, category: DeviceCategoryKey) => {
    setModalDevice(device);
    setModalCategory(category);
    ymReachGoal("repair_open");
  };

  const scrollToDevices = () => document.getElementById("repair-devices")?.scrollIntoView({ behavior: "smooth" });

  const activeCat = DEVICE_CATEGORIES.find((c) => c.key === cat)!;

  return (
    <>
      {/* ── Hero ── */}
      <section className="border-b border-border/60 bg-surface/40">
        <div className="container-page grid items-center gap-8 py-14 md:py-20 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white">
              <Wrench className="size-3.5" /> Сервисный центр · Белгород
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl md:text-5xl">
              Гарантийный ремонт<br className="hidden sm:block" /> iPhone, iPad и Mac
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted md:text-[16px]">
              Торгово-сервисный центр PhoneTrade в Белгороде чинит и обслуживает технику Apple
              в день обращения, с гарантией и оригинальными запчастями. Бесплатная диагностика.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToDevices}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-white transition-colors hover:bg-ink/85"
              >
                <Wrench className="size-[18px]" /> Узнать стоимость ремонта
              </button>
              <span className="text-[13px] text-ink-subtle">Узнайте за одну минуту</span>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {ADVANTAGES.map((a) => (
                <div key={a.title} className="rounded-2xl border border-border/60 bg-white p-4">
                  <a.icon className="size-5 text-ink" strokeWidth={1.75} />
                  <p className="mt-2.5 text-[14px] font-semibold text-ink">{a.title}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Image
              src={HERO_IMAGE}
              alt="Ремонт iPhone с разбитым экраном в Белгороде — сервисный центр PhoneTrade"
              width={520}
              height={620}
              priority
              className="mx-auto h-auto w-full max-w-[440px] object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ── Квиз: выбор устройства ── */}
      <section id="repair-devices" className="container-page py-14 md:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Какое устройство Apple вы хотите вернуть к жизни?
          </h2>
          <p className="mt-3 text-[15px] text-ink-muted">
            Выберите модель — покажем, что можем починить, и примем заявку. Узнайте за одну минуту.
          </p>
        </div>

        {/* Категории */}
        <div className="mt-7 flex flex-wrap gap-2">
          {DEVICE_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              className={cn(
                "inline-flex h-10 items-center rounded-full px-5 text-[14px] font-medium transition-colors",
                cat === c.key ? "bg-ink text-white" : "border border-border bg-white text-ink-muted hover:border-ink/40 hover:text-ink"
              )}
            >
              {c.title}
            </button>
          ))}
        </div>

        {/* Модели */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {activeCat.models.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => openDevice(m, activeCat.key)}
              className="group flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-white px-4 py-3.5 text-left text-[14px] font-medium text-ink transition-colors hover:border-ink hover:bg-surface"
            >
              <span className="truncate">{m}</span>
              <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </button>
          ))}
        </div>
        {activeCat.freeInput ? (
          <p className="mt-4 text-[13px] text-ink-subtle">Не нашли своё устройство? Выберите «Другое устройство Apple» — опишете в заявке.</p>
        ) : null}
      </section>

      {modalDevice ? (
        <RepairModal
          device={modalDevice}
          category={modalCategory}
          initialName={initialName}
          initialPhone={initialPhone}
          onClose={() => setModalDevice(null)}
        />
      ) : null}
    </>
  );
}

// ── Модалка «что чинить» + заявка ────────────────────────────────────────────
function RepairModal({
  device,
  category,
  initialName,
  initialPhone,
  onClose,
}: {
  device: string;
  category: DeviceCategoryKey;
  initialName?: string;
  initialPhone?: string;
  onClose: () => void;
}) {
  const [issues, setIssues] = React.useState<string[]>([]);
  const [comment, setComment] = React.useState("");
  const [name, setName] = React.useState(initialName ?? "");
  const [phone, setPhone] = React.useState(initialPhone ?? "");
  const [marketing, setMarketing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onEsc); document.body.style.overflow = prev; };
  }, [onClose]);

  const toggleIssue = (key: string) =>
    setIssues((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const submit = async () => {
    setError(null);
    if (phone.replace(/\D/g, "").length < 11) { setError("Укажите корректный телефон"); return; }
    if (!name.trim()) { setError("Укажите имя"); return; }
    if (!issues.length && !comment.trim()) { setError("Выберите, что нужно починить"); return; }
    setBusy(true);
    const res = await submitRepairRequest({ device, category, issues, comment, name, phone, consentMarketing: marketing });
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    ymReachGoal("repair_submit");
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Ремонт</p>
            <h3 className="truncate text-[17px] font-semibold text-ink">{device}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-surface hover:text-ink">
            <X className="size-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-ink text-white"><Check className="size-7" /></span>
            <h4 className="mt-5 text-xl font-semibold text-ink">Заявка принята!</h4>
            <p className="mt-2 max-w-sm text-[14px] text-ink-muted">
              Мастер свяжется с вами в ближайшее время, уточнит детали и назовёт стоимость. Диагностика — бесплатно.
            </p>
            <button type="button" onClick={onClose} className="mt-7 inline-flex h-11 items-center rounded-full bg-ink px-7 text-[14px] font-medium text-white hover:bg-ink/85">Готово</button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <p className="text-[13px] font-medium text-ink-subtle">Что нужно починить?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {REPAIR_ISSUES.map((it) => {
                const on = issues.includes(it.key);
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => toggleIssue(it.key)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13.5px] transition-colors",
                      on ? "border-ink bg-ink/[0.04] text-ink" : "border-border bg-white text-ink-muted hover:border-ink/40"
                    )}
                  >
                    <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-[5px] border", on ? "border-ink bg-ink text-white" : "border-border")}>
                      {on ? <Check className="size-3" /> : null}
                    </span>
                    <span className="flex-1">{it.label}</span>
                    {it.free ? <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-subtle">бесплатно</span> : null}
                  </button>
                );
              })}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Опишите проблему подробнее (необязательно)"
              maxLength={500}
              className="mt-4 min-h-[72px] w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40"
            />

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+7 (___) ___-__-__" className="h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-subtle focus:border-ink/40" />
            </div>

            <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] text-ink-muted">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-4" />
              Хочу получать выгодные предложения и акции
            </label>

            {error ? <p className="mt-3 rounded-lg border border-sale/25 bg-sale/5 px-3 py-2 text-[13px] text-sale">{error}</p> : null}

            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-medium text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-5 animate-spin" /> : <Phone className="size-[18px]" />} Оставить заявку на ремонт
            </button>
            <p className="mt-2.5 text-center text-[11px] leading-snug text-ink-subtle">
              Нажимая кнопку, вы принимаете <a href="/offer" className="underline">оферту</a> и даёте{" "}
              <a href="/consent" className="underline">согласие на обработку персональных данных</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
