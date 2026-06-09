# Промт для Claude: cookie-баннер + согласия + многоуровневая аналитика (152-ФЗ)

Скопируй этот файл в корень другого проекта и скажи Claude: **«Реализуй всё по этому
документу под мой стек»**. Здесь — рабочая, проверенная на проде реализация: баннер
cookie с затемнением, многоуровневый сбор аналитики по согласию, фильтр ботов, формы
с галочками согласия и юр-документы. Тексты — на русском, под РФ-законодательство.

> **Claude, прочитай целиком, затем адаптируй под фактический стек проекта.** Эталон
> написан на **Next.js (App Router) + React + TypeScript + Tailwind + Supabase
> (Postgres)**. Если стек другой — сохрани ПОВЕДЕНИЕ и ТЕКСТЫ дословно, перенеси логику
> на местные примитивы. Не ломай существующий дизайн: цвета/радиусы бери из дизайн-системы
> проекта (в эталоне это токены `ink`, `border`, `surface`, утилита `cn()`, класс
> `container-page` — замени на аналоги проекта).

---

## 0. Что должно получиться (резюме)

1. **Cookie-баннер** внизу экрана при первом визите: текст про cookie + 3 кнопки
   «Принять все» / «Только необходимые» / «Настроить», с **лёгким затемнением сайта**
   (scrim) для акцента и плавным появлением. Выбор хранится в first-party cookie на 13 мес.
2. **Drawer «Настройки cookie»** с категориями (Необходимые/Аналитические/Рекламные/
   Маркетинговые) и тумблерами; кнопка «Настройки cookies» в футере открывает его.
3. **Яндекс.Метрика и любые рекламные пиксели грузятся ТОЛЬКО после согласия.**
4. **Многоуровневый сбор статистики:**
   - Уровень 0 (всегда, без согласия) — обезличенно;
   - Уровень 1 (по согласию на аналитику) — постоянный ID + Метрика;
   - Уровень 2 (по согласию на рекламу) — рекламные пиксели.
5. **Фильтр ботов** — чтобы статистика отражала живых людей.
6. **Галочки согласия под формами** (регистрация, заявки) с точными текстами + кнопка
   активна только после обязательных галочек.
7. **Политика конфиденциальности + Согласие на ПДн** — корректные под закон (отдельный
   документ согласия, активное согласие = ПЭП, cookie-раздел и т.д.).
8. **Подтверждение прав в Яндекс.Вебмастере** через meta-тег.

---

## 1. Юридические принципы (соблюдать обязательно)

- **Аналитические/рекламные cookie — только с согласия.** До согласия можно собирать
  лишь обезличенную статистику без идентификации.
- **Согласие = активное действие** (клик по кнопке / галочка), не «продолжая пользоваться
  сайтом». Симметрия выбора: отклонить так же легко, как принять (отдельная кнопка
  «Только необходимые» равного размера, без серого/мелкого/спрятанного — анти-dark-pattern).
- **Согласие на обработку ПДн оформляется ОТДЕЛЬНЫМ документом** (ст. 9 152-ФЗ в ред.
  с 01.09.2025), не объединённым с политикой/офертой.
- Никаких **pre-checked** галочек в настройках cookie (по умолчанию всё, кроме
  необходимого, выключено).
- В баннере/политике факт должен совпадать с реальностью (что собираем — то и пишем).

---

## 2. Cookie-баннер согласия (полный компонент)

Файл `src/components/legal/CookieConsent.tsx`. Это `Provider`, который оборачивает сайт
(положи в корневой layout вокруг `children`). Хранит выбор в cookie `pt_cookie_consent`
(13 мес), грузит Метрику только при согласии, показывает баннер с затемнением и drawer.

```tsx
"use client";

import * as React from "react";
import Script from "next/script";
import Link from "next/link";
import { cn } from "@/lib/utils/cn"; // ← утилита склейки классов (clsx/tailwind-merge)

/**
 * Cookie-согласие. Тонкая полоса внизу + drawer настроек + лёгкое затемнение
 * сайта для акцента. Выбор хранится в first-party cookie pt_cookie_consent (13 мес).
 * Аналитика (Я.Метрика) грузится ТОЛЬКО при согласии.
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

export function CookieConsentProvider({ children, metrikaId }: { children: React.ReactNode; metrikaId?: string | null }) {
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

      {metrikaId && consent?.analytics ? (
        <noscript><div><img src={`https://mc.yandex.ru/watch/${Number(metrikaId)}`} style={{ position: "absolute", left: "-9999px" }} alt="" /></div></noscript>
      ) : null}

      {/* ВНИМАНИЕ: рекламные пиксели (VK Ads и т.п.) вешать ПО ОТДЕЛЬНОМУ согласию:
          {consent?.advertising ? <VkAdsPixel/> : null} — НЕ под analytics. */}

      {showBanner ? (
        <>
          {/* Лёгкое затемнение сайта — акцент на плашке. pointer-events-none = НЕ cookie-wall. */}
          <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] bg-ink/20 duration-500 animate-in fade-in" />
          <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-border/60 bg-white/95 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.18)] backdrop-blur-md duration-500 animate-in fade-in slide-in-from-bottom-4">
          <div className="container-page flex flex-col gap-3.5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <p className="text-[13px] leading-relaxed text-ink-muted lg:max-w-2xl">
              Мы используем cookie для аналитики (Яндекс.Метрика), чтобы находить ошибки
              и улучшать сайт для вас. Подробнее — в{" "}
              <Link href="/privacy" className="text-ink underline underline-offset-2 hover:opacity-70">политике конфиденциальности</Link>.
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <button type="button" onClick={acceptAll} className="rounded-full bg-ink px-6 py-2.5 text-center text-[14px] font-semibold text-white hover:bg-ink/90">Принять все</button>
              <button type="button" onClick={onlyNecessary} className="rounded-full border-[1.5px] border-ink bg-white px-5 py-2.5 text-center text-[14px] font-semibold text-ink hover:bg-surface">Только необходимые</button>
              <button type="button" onClick={() => setDrawer(true)} className="px-3 py-2 text-center text-[13px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline">Настроить</button>
            </div>
          </div>
        </div>
        </>
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
      <button type="button" role="switch" aria-checked={checked} disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors", checked ? "bg-ink" : "bg-border-strong", disabled && "opacity-60")}>
        <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
      </button>
    </div>
  );
}

/** Кнопка «Настройки cookies» для футера. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const { openSettings } = useCookieConsent();
  return <button type="button" onClick={openSettings} className={className}>Настройки cookies</button>;
}
```

**Подключение:**
- Оберни приложение: в корневом layout `<CookieConsentProvider metrikaId={процессИзНастроек}> {children} </CookieConsentProvider>`.
- В футер добавь `<CookieSettingsButton className="..." />` — чтобы пользователь мог
  переоткрыть настройки и отозвать согласие.
- `metrikaId` — номер счётчика Яндекс.Метрики (из env или настроек). Если null — Метрика
  не грузится вовсе.
- Затемнение: `animate-in fade-in slide-in-from-bottom-4` — из пакета **`tw-animate-css`**
  (`@import "tw-animate-css";` в globals.css). Если его нет — добавь, либо замени на свои
  keyframes fade/slide.

---

## 3. Многоуровневая аналитика (track.ts)

Файл `src/lib/analytics/track.ts`. Клиентский трекинг через anon-клиент Supabase
(RLS должен разрешать `anon insert` в таблицы аналитики). Централизованно читает согласие
из cookie `pt_cookie_consent` и решает, что писать.

```ts
"use client";

import { supabase } from "@/lib/supabase/client"; // ← anon-клиент проекта

/**
 * МНОГОУРОВНЕВЫЙ СБОР ПО СОГЛАСИЮ:
 *  • Уровень 0 — ВСЕГДА: обезличенно (path, referrer, device_type, бакеты browser/os,
 *    счёт по эфемерной сессии sessionStorage). Согласия не требует.
 *  • Уровень 1 — при согласии на аналитику: постоянный visitor_id (localStorage),
 *    is_new_visitor, сырой user_agent. Я.Метрика грузится отдельно (CookieConsent).
 *  • Уровень 2 — реклама (consent.advertising): пиксели (вешаются в CookieConsent).
 * На Уровне 0 НЕ создаём постоянный visitor_id — getVisitorId() только в ветке согласия.
 */

const VISITOR_KEY = "pt:vid";
const SESSION_KEY = "pt:sid";
const CONSENT_COOKIE = "pt_cookie_consent";

type AnalyticsConsent = { analytics: boolean; advertising: boolean };

function readConsent(): AnalyticsConsent {
  try {
    if (typeof document === "undefined") return { analytics: false, advertising: false };
    const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
    if (!m) return { analytics: false, advertising: false };
    const c = JSON.parse(decodeURIComponent(m[1])) as { analytics?: boolean; advertising?: boolean };
    return { analytics: !!c.analytics, advertising: !!c.advertising };
  } catch { return { analytics: false, advertising: false }; }
}

/** Грубая клиентская детекция ботов (webdriver + UA-кейворды). */
function isLikelyBot(): boolean {
  if (typeof navigator === "undefined") return false;
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return true;
  return /bot|crawl|spider|slurp|headless|phantom|playwright|puppeteer|lighthouse|ahrefs|semrush|bytespider|petalbot|dataforseo/i.test(navigator.userAgent || "");
}

/** Постоянный ID посетителя (localStorage). ТОЛЬКО при согласии (Уровень 1). */
export function getVisitorId(): { id: string; isNew: boolean } {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (id) return { id, isNew: false };
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return { id, isNew: true };
  } catch { return { id: "anon", isNew: false }; }
}

/** Эфемерная сессия (sessionStorage) — Уровень 0. */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return "anon"; }
}

export function deviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(ua)) return "mobile";
  return "desktop";
}
function browserName(ua: string): string {
  if (/YaBrowser/i.test(ua)) return "Yandex";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  if (/Firefox\//i.test(ua)) return "Firefox";
  return "Other";
}
function osName(ua: string): string {
  if (/Windows/i.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

/** Просмотр страницы + событие воронки. */
export function trackPageView(path: string): void {
  if (!supabase) return;
  const consent = readConsent();
  const bot = isLikelyBot();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  const row: Record<string, unknown> = {
    path,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    session_id: getSessionId(),
    device_type: deviceType(),
    browser: browserName(ua),
    os: osName(ua),
    is_bot: bot,
  };
  if (consent.analytics) { // Уровень 1 — идентификация только по согласию
    const { id, isNew } = getVisitorId();
    row.visitor_id = id; row.is_new_visitor = isNew; row.user_agent = ua;
  }
  void supabase.from("page_views").insert(row).then(() => {});

  if (bot) return; // боты не идут в воронку/поиск
  trackFunnel("view_page", { path });
  const m = path.match(/^\/product\/([^/?#]+)/);
  if (m) trackFunnel("view_product", { product_id: m[1] });
}

const FUNNEL_TYPES = ["view_page","view_product","add_to_cart","remove_from_cart","begin_checkout","enter_contact","select_payment","submit_order","pay_order","add_to_wishlist","search"] as const;
export type FunnelEventType = (typeof FUNNEL_TYPES)[number];

export function trackFunnel(eventType: FunnelEventType, payload?: Record<string, unknown>): void {
  if (!supabase || isLikelyBot()) return;
  const row: Record<string, unknown> = { session_id: getSessionId(), event_type: eventType, payload: payload ?? null };
  if (readConsent().analytics) row.visitor_id = getVisitorId().id;
  void supabase.from("funnel_events").insert(row).then(() => {});
}

export function trackSearch(query: string, resultsCount: number): void {
  if (!supabase || !query.trim() || isLikelyBot()) return;
  const row: Record<string, unknown> = { query: query.trim(), normalized_query: query.trim().toLowerCase(), results_count: resultsCount, session_id: getSessionId() };
  if (readConsent().analytics) row.visitor_id = getVisitorId().id;
  void supabase.from("search_queries").insert(row).then(() => {});
}
```

**Подключение:** компонент-трекер (client) на каждое изменение пути зовёт `trackPageView`:

```tsx
"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics/track";

export function PageViewTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return; // не трекаем админку
    trackPageView(pathname);
    first.current = false;
  }, [pathname]);
  return null;
}
```

Вставь `<PageViewTracker />` в layout. Вызывай `trackFunnel("add_to_cart", …)` /
`trackSearch(q, n)` в нужных местах (корзина, поиск).

---

## 4. БД: таблицы аналитики + фильтр ботов + агрегаты

### 4.1. Таблицы (Postgres / Supabase)

```sql
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text,
  utm jsonb,
  session_id text,
  visitor_id text,           -- только при согласии (Уровень 1)
  is_new_visitor boolean,
  user_agent text,           -- только при согласии
  device_type text, browser text, os text,
  country text, city text, region text,
  is_bot boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.funnel_events (
  id bigint generated always as identity primary key,
  session_id text, visitor_id text,
  event_type text not null, payload jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.search_queries (
  id bigint generated always as identity primary key,
  query text not null, normalized_query text, results_count int,
  session_id text, visitor_id text,
  created_at timestamptz not null default now()
);
-- RLS: разрешить anon INSERT (и только insert) в эти таблицы. Чтение — service_role/админ.
alter table public.page_views enable row level security;
create policy "anon insert page_views" on public.page_views for insert to anon with check (true);
-- аналогично для funnel_events / search_queries.
create index if not exists idx_page_views_human on public.page_views (created_at) where is_bot = false;
```

### 4.2. Фильтр ботов (бэкфилл + правило)

Один скрапер с фиксированным UA может нагенерить десятки тысяч строк. Правило:
**UA, встречающийся > 1000 раз = бот** (реальные UA столько не набирают на малом сайте) +
кейворд-список. Помечаем флагом (строки не удаляем — для истории), дашборд считает
`is_bot = false`.

```sql
update public.page_views p set is_bot = true
where is_bot = false and (
  user_agent ~* '(bot|crawl|spider|slurp|headless|phantom|playwright|puppeteer|python|curl|wget|http-client|go-http|java/|lighthouse|ahrefs|semrush|bytespider|petalbot|dataforseo|mj12|dotbot|nexus 5x build/mmb29p)'
  or user_agent in (
    select user_agent from public.page_views where user_agent is not null
    group by user_agent having count(*) > 1000
  )
);
```

> Рекомендуется повесить этот UPDATE на периодический cron (раз в неделю) — ловить новые
> бот-всплески. Плюс клиентский `isLikelyBot()` (в track.ts) метит честных ботов сразу.

### 4.3. Агрегация — ТОЛЬКО в БД (критично!)

**Не тяните сырые строки в код с `.limit(N)` и не считайте в JS** — без `ORDER BY`
выборка недетерминированная, цифры будут скакать при каждой перезагрузке и обрежутся на N.
Считайте через SQL-функции. Пример сводки (остальные — по аналогии: by_day, by_referrer,
by_device, top_pages, new_returning):

```sql
create or replace function public.analytics_summary(p_from timestamptz, p_to timestamptz)
returns table(visitors bigint, pageviews bigint, sessions bigint, bounce_sessions bigint)
language sql stable as $fn$
  with pv as (
    select coalesce(visitor_id, session_id) as vid, session_id
    from public.page_views
    where created_at >= p_from and created_at <= p_to and is_bot = false
  ), s as (select session_id, count(*) c from pv where session_id is not null group by session_id)
  select (select count(distinct vid) from pv)::bigint,
         (select count(*) from pv)::bigint,
         (select count(*) from s)::bigint,
         (select count(*) from s where c = 1)::bigint
$fn$;
```

Вызов из кода: `db.rpc("analytics_summary", { p_from, p_to })`. Все функции считают только
`is_bot = false`. Дату дня брать как `(created_at at time zone 'UTC')::date`.

---

## 5. Формы и галочки согласия

Под КАЖДОЙ формой, собирающей ПДн (регистрация, заявка, заказ), — галочки. **Кнопка
отправки неактивна, пока не отмечены ВСЕ обязательные** (маркетинговая — необязательная).

### Что должно быть (галочки оферты НЕТ — она избыточна)
- ☑️ **Даю [согласие на обработку персональных данных](/consent)** — обязательная **галочка**.
- ☐ **Хочу получать акции и новинки (необязательно)** — маркетинг, опциональная галочка.
- (для заявки на услугу/ремонт) ☑️ **Ознакомлен(а) с [правилами …](/service-rules)** —
  обязательная галочка.
- **Принятие оферты и политики — НЕ галочкой, а текстом под кнопкой** (оферта принимается
  фактом действия; ознакомление с политикой чекбокса не требует):
  > Нажимая «<текст кнопки>», вы принимаете условия [оферты](/offer) и [политики
  > конфиденциальности](/privacy)

### Паттерн (React)
```tsx
const [cPd, setCPd] = React.useState(false);
const [marketing, setMarketing] = React.useState(false);
// ...
const submit = async () => {
  if (!cPd) { setError("Необходимо дать согласие на обработку персональных данных"); return; }
  // payload: consentPd: cPd, consentMarketing: marketing,
  //          consentOferta: true (принятие = факт действия, см. текст под кнопкой)
};
// в JSX:
<label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
  <input type="checkbox" checked={cPd} onChange={(e) => setCPd(e.target.checked)} className="mt-0.5 size-4" />
  <span>Даю <a href="/consent" target="_blank" className="text-ink underline">согласие на обработку персональных данных</a></span>
</label>
<label className="flex cursor-pointer items-start gap-2 text-[12.5px] text-ink-muted">
  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-4" />
  <span>Хочу получать акции и новинки (необязательно)</span>
</label>
// кнопка:
<button type="button" onClick={submit} disabled={busy || !cPd} className="... disabled:cursor-not-allowed disabled:opacity-60">Отправить</button>
// текст под кнопкой:
<p className="mt-3 text-[12px] leading-snug text-ink-subtle">
  Нажимая «Отправить», вы принимаете условия{" "}
  <a href="/offer" target="_blank" className="underline underline-offset-2 hover:text-ink">оферты</a> и{" "}
  <a href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-ink">политики конфиденциальности</a>
</p>
```

**НЕ писать** пассивных фраз «Продолжая пользоваться сайтом, вы соглашаетесь…» (ПДн-согласие
только активной галочкой). Текст «Нажимая «<кнопка>», вы принимаете оферту/политику» —
допустим (оферта = акцепт действием). Для авторизованного пользователя, уже давшего
ПДн-согласие при регистрации, галочку ПДн можно скрыть (но «ознакомлен с правилами услуги»
показывать всем — это принятие условий услуги, не ПДн).

### Логирование согласий (рекомендуется)
При сабмите писать запись в таблицу `data_consents` (тип согласия, версия, IP, user-agent,
страница, время) — для доказуемости по 152-ФЗ.

---

## 6. Юридические документы (страницы /privacy и /consent)

Сделай ДВЕ отдельные страницы. Текст — под реального оператора (подставь данные владельца:
`{{НАИМЕНОВАНИЕ}}`, `{{ИНН}}`, `{{АДРЕС}}`, `{{EMAIL}}`, `{{САЙТ}}`). **Без банковских
реквизитов в политике.** Закон цитировать как «в действующей редакции».

### 6.1. Политика конфиденциальности `/privacy` — структура (13 разделов)
1. Общие положения (реквизиты оператора без банка; ссылка на закон «в действующей
   редакции, с изм. с 01.09.2025»; «согласие оформляется отдельным документом — см. п. 4.2»).
2. **Основные понятия** (ПДн, обработка, оператор, субъект, cookie).
3. Цели обработки.
4. Правовые основания. **П. 4.2: согласие — в виде ОТДЕЛЬНОГО документа** (ст. 9 152-ФЗ
   в ред. с 01.09.2025), не объединённого с иными.
5. Категории субъектов и перечень данных (+ п. 5.4 **принцип минимизации**).
6. Инструменты веб-аналитики и ретаргетинга (Яндекс.Метрика; рекламный пиксель, если есть).
7. Способы и условия (п. 7.3 **хранение баз на территории РФ**; 7.4 нет трансгранички).
8. **Передача третьим лицам** (перечислить получателей: Яндекс, рекламная сеть, бухгалтер,
   доставка; «иным не передаём/не продаём»).
9. Меры безопасности (**назначен ответственный за обработку** и т.д.).
10. **Использование файлов cookie** (см. ниже 6.3).
11. Права субъектов (+ **срок ответа на обращение — 30 дней**).
12. Сроки обработки и хранения.
13. Заключительные положения + дата вступления в силу редакции.

### 6.2. Согласие на обработку ПДн `/consent` — структура (отдельный документ!)
- Шапка: «оформлено в виде ОТДЕЛЬНОГО документа в соответствии со ст. 9 152-ФЗ (в
  действующей редакции, с изм. с 01.09.2025)».
- 1. Категории данных. 2. Цели. 3. Действия + **п.: не распространяется на распространение
  неограниченному кругу лиц (ст. 10.1)**. 4. Получатели. 5. Сервисы/cookie (+ ссылка на
  политику). 6. Срок и **отзыв (e-mail/почта, 30 дней)**. 7. **Отдельное согласие на
  рекламные рассылки** (ст. 18 «О рекламе», галочкой, отзыв независимо/по «отписаться»).
- **8. Порядок выражения:** согласие = активное действие (галочка + кнопка отправки) =
  **простая электронная подпись по ст. 6 ФЗ-63 «Об электронной подписи»**. НЕ «продолжая
  пользоваться сайтом».

### 6.3. Раздел про cookie в политике (обязательный минимум)
- Что такое cookie и зачем.
- **Категории с примерами:**
  - **Технические (обязательные)** — сессия, авторизация, корзина, защита форм, фиксация
    cookie-согласия; **+ сбор обезличенной статистики посещений без идентификации** (всегда).
  - **Аналитические** (только с согласия) — **Яндекс.Метрика** (ООО «Яндекс»): собираемые
    данные (IP, идентификатор браузера, страницы, действия, прибл. геолокация, тип
    устройства), **срок хранения — до 26 месяцев**, ссылка на политику Яндекса
    `https://yandex.ru/legal/confidential/`.
  - **Рекламные** (только с согласия) — рекламный пиксель (напр. **VK Ads Pixel**, ООО
    «ВКонтакте»): данные (посещения, действия, идентификатор браузера), **срок — до 12
    месяцев**, ссылка `https://vk.com/privacy`.
- **Управление согласием** — через кнопку «Настройки cookies» в футере + удаление cookie
  в браузере.
- **Передача данных третьим лицам** — сервисам по их политикам; иным не продаём/не передаём.
- НЕ писать «продолжая использовать сайт — соглашаетесь» и не ссылаться на несуществующий
  отдельный cookie-документ (cookie — раздел политики, отдельный файл не нужен).

---

## 7. Подтверждение прав в Яндекс.Вебмастере

Добавить meta-тег **server-side, безусловно** (не через consent-gated код — бот согласие
не даёт). В Next.js — через Metadata корневого layout:

```ts
export const metadata: Metadata = {
  // ...
  verification: { yandex: "ВАШ_КОД" }, // рендерит <meta name="yandex-verification" content="...">
};
```

В других стеках — просто отдать `<meta name="yandex-verification" content="ВАШ_КОД">` в
`<head>` всех страниц. Затем в Вебмастере выбрать «Мета-тег» → «Проверить».

---

## 8. Чек-лист приёмки

- [ ] Баннер появляется при первом визите с **затемнением** и плавной анимацией; 3 кнопки.
- [ ] «Принять все» и «Только необходимые» — равной заметности (анти-dark-pattern).
- [ ] Выбор сохраняется в cookie `pt_cookie_consent` (13 мес); повторно баннер не показывается.
- [ ] «Настройки cookies» в футере открывают drawer; тумблеры по умолчанию **выключены**.
- [ ] Яндекс.Метрика и рекламные пиксели **не грузятся до согласия** (проверить в Network).
- [ ] До согласия пишется обезличенный `page_view` (без `visitor_id`/`user_agent`); после —
      с идентификацией. Проверить тело запроса в DevTools.
- [ ] Боты помечаются `is_bot`, дашборд считает `is_bot = false`; цифры **стабильны** при
      перезагрузке (агрегация в SQL, не в JS).
- [ ] Под формами — галочки с точными текстами; кнопка неактивна без обязательных.
- [ ] Нигде нет пассивного «продолжая, вы соглашаетесь…».
- [ ] Страницы `/privacy` и `/consent` — отдельные, под реального оператора, с cookie-разделом.
- [ ] Meta-тег Яндекс-верификации в `<head>` на всех страницах.

---

**Источник:** реализация проекта PhoneTrade (Next.js 16 + Supabase). Адаптируй пути,
токены дизайна и стек под целевой проект, сохранив поведение и тексты.
