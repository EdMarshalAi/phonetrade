"use client";

import { supabase } from "@/lib/supabase/client";

/**
 * Клиентский трекинг для аналитики сайта. Пишет в page_views / funnel_events /
 * hero_slide_events через anon-клиент (RLS разрешает anon insert). Всё
 * fire-and-forget: не блокирует UI, молча игнорирует ошибки.
 *
 * МНОГОУРОВНЕВЫЙ СБОР ПО СОГЛАСИЮ (152-ФЗ / cookie):
 *  • Уровень 0 — ВСЕГДА (без согласия): обезличенное first-party измерение,
 *    которое не идентифицирует человека — path, referrer, device_type, бакеты
 *    browser/os и счёт по ЭФЕМЕРНОЙ сессии (sessionStorage). Юридически —
 *    обезличенная статистика, согласия не требует.
 *  • Уровень 1 — только при согласии на аналитику (consent.analytics):
 *    ПОСТОЯННЫЙ visitor_id (localStorage), is_new_visitor, сырой user_agent.
 *    Я.Метрика грузится отдельно (CookieConsent), тоже только при согласии.
 *  • Уровень 2 — реклама (consent.advertising): VK Ads Pixel и пр. (вешается в
 *    CookieConsent, не здесь).
 *
 * ВАЖНО: на Уровне 0 НЕ создаём и НЕ читаем постоянный visitor_id (иначе это уже
 * не обезличенный сбор) — getVisitorId() вызывается ТОЛЬКО внутри ветки согласия.
 */

const VISITOR_KEY = "pt:vid";
const SESSION_KEY = "pt:sid";
const CONSENT_COOKIE = "pt_cookie_consent";

type AnalyticsConsent = { analytics: boolean; advertising: boolean };

/** Читает выбор cookie-согласия из first-party cookie (пишет CookieConsent). */
function readConsent(): AnalyticsConsent {
  try {
    if (typeof document === "undefined") return { analytics: false, advertising: false };
    const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
    if (!m) return { analytics: false, advertising: false };
    const c = JSON.parse(decodeURIComponent(m[1])) as { analytics?: boolean; advertising?: boolean };
    return { analytics: !!c.analytics, advertising: !!c.advertising };
  } catch {
    return { analytics: false, advertising: false };
  }
}

/** Стабильный анонимный ID посетителя (localStorage). ТОЛЬКО при согласии (Уровень 1). */
export function getVisitorId(): { id: string; isNew: boolean } {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (id) return { id, isNew: false };
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return { id, isNew: true };
  } catch {
    return { id: "anon", isNew: false };
  }
}

/** ID сессии (sessionStorage — живёт до закрытия вкладки). Эфемерный — Уровень 0. */
export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/** Грубая клиентская детекция ботов/автоматизации (webdriver + UA-кейворды). */
function isLikelyBot(): boolean {
  if (typeof navigator === "undefined") return false;
  if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return true;
  return /bot|crawl|spider|slurp|headless|phantom|playwright|puppeteer|lighthouse|ahrefs|semrush|bytespider|petalbot|dataforseo/i.test(navigator.userAgent || "");
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

/** Запись просмотра страницы + событие воронки view_page (и view_product). */
export function trackPageView(path: string): void {
  if (!supabase) return;
  const consent = readConsent();
  const bot = isLikelyBot();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  // Уровень 0 — обезличенные поля (бакеты browser/os считаются из UA, но сам UA
  // не сохраняется; идентификатор — только эфемерная сессия). is_bot — чтобы
  // дашборд исключал автоматизацию из «живой» статистики.
  const row: Record<string, unknown> = {
    path,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    session_id: getSessionId(),
    device_type: deviceType(),
    browser: browserName(ua),
    os: osName(ua),
    is_bot: bot,
  };

  // Уровень 1 — идентификация только при согласии на аналитику.
  if (consent.analytics) {
    const { id: visitorId, isNew } = getVisitorId();
    row.visitor_id = visitorId;
    row.is_new_visitor = isNew;
    row.user_agent = ua;
  }

  void supabase.from("page_views").insert(row).then(() => {});

  // Боты в воронку/поиск не пишем — они засоряют конверсию.
  if (bot) return;
  trackFunnel("view_page", { path });
  const m = path.match(/^\/product\/([^/?#]+)/);
  if (m) trackFunnel("view_product", { product_id: m[1] });
}

const FUNNEL_TYPES = [
  "view_page",
  "view_product",
  "add_to_cart",
  "remove_from_cart",
  "begin_checkout",
  "enter_contact",
  "select_payment",
  "submit_order",
  "pay_order",
  "add_to_wishlist",
  "search",
] as const;
export type FunnelEventType = (typeof FUNNEL_TYPES)[number];

export function trackFunnel(eventType: FunnelEventType, payload?: Record<string, unknown>): void {
  if (!supabase || isLikelyBot()) return;
  const row: Record<string, unknown> = { session_id: getSessionId(), event_type: eventType, payload: payload ?? null };
  if (readConsent().analytics) row.visitor_id = getVisitorId().id;
  void supabase.from("funnel_events").insert(row).then(() => {});
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Показ/клик hero-слайда (slideId должен быть uuid из БД). Уровень 0 — только сессия. */
export function trackHero(slideId: string, eventType: "view" | "click"): void {
  if (!supabase || !UUID_RE.test(slideId)) return;
  void supabase
    .from("hero_slide_events")
    .insert({ slide_id: slideId, event_type: eventType, session_id: getSessionId() })
    .then(() => {});
}

/** Поисковый запрос с сайта. visitor_id — только при согласии (Уровень 1). */
export function trackSearch(query: string, resultsCount: number): void {
  if (!supabase || !query.trim() || isLikelyBot()) return;
  const row: Record<string, unknown> = {
    query: query.trim(),
    normalized_query: query.trim().toLowerCase(),
    results_count: resultsCount,
    session_id: getSessionId(),
  };
  if (readConsent().analytics) row.visitor_id = getVisitorId().id;
  void supabase.from("search_queries").insert(row).then(() => {});
}
