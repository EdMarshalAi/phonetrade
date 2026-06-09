"use client";

import * as React from "react";
import Script from "next/script";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CustomCodeInjector } from "@/components/integrations/CustomCodeInjector";
import type { CodeSnippet } from "@/lib/integrations/snippets";

/**
 * Cookie-согласие (152-ФЗ / 38-ФЗ). Тонкая полоска внизу + drawer настроек.
 * Выбор хранится в first-party cookie pt_cookie_consent (13 мес). Аналитика
 * (Я.Метрика) грузится ТОЛЬКО при согласии. Кнопка в футере открывает настройки.
 */
type Categories = { analytics: boolean; advertising: boolean; marketing: boolean };
type Consent = Categories & { ts: string; v: string };
const KEY = "pt_cookie_consent";
const MAX_AGE = 13 * 30 * 24 * 60 * 60; // ~13 месяцев

function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`));
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])) as Consent; } catch { return null; }
}
function writeConsent(c: Consent) {
  document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(c))}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

type Ctx = { openSettings: () => void };
const CookieCtx = React.createContext<Ctx>({ openSettings: () => {} });
export const useCookieConsent = () => React.useContext(CookieCtx);

export function CookieConsentProvider({ children, metrikaId, codeSnippets = [] }: { children: React.ReactNode; metrikaId?: string | null; codeSnippets?: CodeSnippet[] }) {
  const [mounted, setMounted] = React.useState(false);
  const [consent, setConsent] = React.useState<Consent | null>(null);
  const [decided, setDecided] = React.useState(true); // до маунта не показываем (без гидрейшн-скачка)
  const [drawer, setDrawer] = React.useState(false);
  const [cats, setCats] = React.useState<Categories>({ analytics: false, advertising: false, marketing: false });

  React.useEffect(() => {
    setMounted(true);
    const c = readConsent();
    setConsent(c);
    setDecided(!!c);
    if (c) setCats({ analytics: c.analytics, advertising: c.advertising, marketing: c.marketing });
  }, []);

  const persist = (next: Categories) => {
    const c: Consent = { ...next, ts: new Date().toISOString().slice(0, 10), v: "1" };
    writeConsent(c);
    setConsent(c);
    setCats(next);
    setDecided(true);
    setDrawer(false);
  };
  const acceptAll = () => persist({ analytics: true, advertising: true, marketing: true });
  const onlyNecessary = () => persist({ analytics: false, advertising: false, marketing: false });

  const showBanner = mounted && !decided && !drawer;

  return (
    <CookieCtx.Provider value={{ openSettings: () => setDrawer(true) }}>
      {children}

      {/* Я.Метрика — только при согласии на аналитику */}
      {metrikaId && consent?.analytics ? (
        <Script id="ym-metrika" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
          for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
          window.__ymId=${Number(metrikaId)};window.dataLayer=window.dataLayer||[];
          ym(${Number(metrikaId)},"init",{webvisor:true,clickmap:true,trackLinks:true,accurateTrackBounce:true,ecommerce:"dataLayer"});
        ` }} />
      ) : null}
      {/* Кастомные код-сниппеты из админки (счётчики/пиксели/виджеты) — при согласии на аналитику */}
      <CustomCodeInjector snippets={codeSnippets} allowed={!!consent?.analytics} />

      {metrikaId && consent?.analytics ? (
        <noscript><div><img src={`https://mc.yandex.ru/watch/${Number(metrikaId)}`} style={{ position: "absolute", left: "-9999px" }} alt="" /></div></noscript>
      ) : null}

      {showBanner ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-border/60 bg-white/95 backdrop-blur-md">
          <div className="container-page flex flex-col gap-3.5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <p className="text-[13px] leading-relaxed text-ink-muted lg:max-w-2xl">
              Для работы сайта мы собираем обезличенную статистику посещений (без идентификации).
              Аналитические cookie (Яндекс.Метрика) и расширенная аналитика подключаются только
              с вашего согласия. Подробнее — в{" "}
              <Link href="/privacy" className="text-ink underline underline-offset-2 hover:opacity-70">политике конфиденциальности</Link>.
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <button type="button" onClick={acceptAll} className="rounded-full bg-ink px-6 py-2.5 text-center text-[14px] font-semibold text-white hover:bg-ink/90">Принять все</button>
              <button type="button" onClick={onlyNecessary} className="rounded-full border-[1.5px] border-ink bg-white px-5 py-2.5 text-center text-[14px] font-semibold text-ink hover:bg-surface">Только необходимые</button>
              <button type="button" onClick={() => setDrawer(true)} className="px-3 py-2 text-center text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">Настроить</button>
            </div>
          </div>
        </div>
      ) : null}

      {drawer ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setDrawer(false)} aria-hidden />
          <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl sm:p-7">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Настройки cookie</h2>
            <p className="mt-1 text-[13px] text-ink-muted">Выберите, какие cookie разрешить. Необходимые нужны для работы сайта и корзины.</p>
            <div className="mt-5 space-y-2.5">
              <CookieRow title="Необходимые" desc="Работа сайта, корзина, авторизация + обезличенная статистика (без идентификации)" checked disabled />
              <CookieRow title="Аналитические" desc="Яндекс.Метрика, узнавание новых/вернувшихся — улучшение сайта" checked={cats.analytics} onChange={(v) => setCats((c) => ({ ...c, analytics: v }))} />
              <CookieRow title="Рекламные" desc="Пиксели для рекламы" checked={cats.advertising} onChange={(v) => setCats((c) => ({ ...c, advertising: v }))} />
              <CookieRow title="Маркетинговые" desc="Ремаркетинг и персональные предложения" checked={cats.marketing} onChange={(v) => setCats((c) => ({ ...c, marketing: v }))} />
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button type="button" onClick={onlyNecessary} className="rounded-full border border-border px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface">Только необходимые</button>
              <button type="button" onClick={() => persist(cats)} className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-white hover:bg-ink/90">Сохранить настройки</button>
            </div>
          </div>
        </div>
      ) : null}
    </CookieCtx.Provider>
  );
}

function CookieRow({ title, desc, checked, onChange, disabled }: { title: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3", disabled && "bg-surface/50")}>
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{title}</p>
        <p className="text-[12px] text-ink-subtle">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors", checked ? "bg-ink" : "bg-border-strong", disabled && "opacity-60")}
      >
        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
      </button>
    </div>
  );
}

/** Кнопка «Настройки cookies» для футера. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { openSettings } = useCookieConsent();
  return (
    <button type="button" onClick={openSettings} className={className}>
      Настройки cookies
    </button>
  );
}
