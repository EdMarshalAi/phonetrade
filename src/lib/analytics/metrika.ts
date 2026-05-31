/**
 * Клиентские хелперы Яндекс.Метрики. Безопасны при отсутствии счётчика/согласия
 * (если ym не загружен — no-op). Счётчик инициализируется в CookieConsent при
 * согласии на аналитику и выставляет `window.__ymId`.
 */
type Ym = (id: number, method: string, ...args: unknown[]) => void;

function ym(): { fn: Ym; id: number } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { ym?: Ym; __ymId?: number };
  if (typeof w.ym !== "function" || !w.__ymId) return null;
  return { fn: w.ym, id: w.__ymId };
}

/** Достижение цели (конверсия). params — напр. { order_price, currency }. */
export function ymReachGoal(target: string, params?: Record<string, unknown>): void {
  const m = ym();
  if (m) m.fn(m.id, "reachGoal", target, params);
}

/** SPA-просмотр страницы при клиентской навигации. */
export function ymHit(url: string): void {
  const m = ym();
  if (m) m.fn(m.id, "hit", url, { referer: typeof document !== "undefined" ? document.referrer : "" });
}

/** E-commerce purchase в dataLayer (выручка по заказу). */
export function ymPurchase(order: {
  id: string;
  total: number;
  items?: { id: string; name: string; price: number; quantity: number }[];
}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({
    ecommerce: {
      currencyCode: "RUB",
      purchase: {
        actionField: { id: order.id, revenue: order.total },
        products: (order.items ?? []).map((p) => ({ id: p.id, name: p.name, price: p.price, quantity: p.quantity })),
      },
    },
  });
}
