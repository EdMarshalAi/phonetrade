"use client";

import { supabase } from "@/lib/supabase/client";

/**
 * Клиентский трекинг для аналитики сайта. Пишет в page_views / funnel_events /
 * hero_slide_events через anon-клиент (RLS разрешает anon insert). Всё
 * fire-and-forget: не блокирует UI, молча игнорирует ошибки.
 */

const VISITOR_KEY = "pt:vid";
const SESSION_KEY = "pt:sid";

/** Стабильный анонимный ID посетителя (localStorage). */
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

/** ID сессии (sessionStorage — живёт до закрытия вкладки). */
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
  const { id: visitorId, isNew } = getVisitorId();
  const sessionId = getSessionId();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  void supabase
    .from("page_views")
    .insert({
      path,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      session_id: sessionId,
      visitor_id: visitorId,
      is_new_visitor: isNew,
      device_type: deviceType(),
      browser: browserName(ua),
      os: osName(ua),
      user_agent: ua,
    })
    .then(() => {});

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
  if (!supabase) return;
  void supabase
    .from("funnel_events")
    .insert({ session_id: getSessionId(), visitor_id: getVisitorId().id, event_type: eventType, payload: payload ?? null })
    .then(() => {});
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Показ/клик hero-слайда (slideId должен быть uuid из БД). */
export function trackHero(slideId: string, eventType: "view" | "click"): void {
  if (!supabase || !UUID_RE.test(slideId)) return;
  void supabase
    .from("hero_slide_events")
    .insert({ slide_id: slideId, event_type: eventType, session_id: getSessionId() })
    .then(() => {});
}

/** Поисковый запрос с сайта. */
export function trackSearch(query: string, resultsCount: number): void {
  if (!supabase || !query.trim()) return;
  void supabase
    .from("search_queries")
    .insert({
      query: query.trim(),
      normalized_query: query.trim().toLowerCase(),
      results_count: resultsCount,
      session_id: getSessionId(),
      visitor_id: getVisitorId().id,
    })
    .then(() => {});
}
