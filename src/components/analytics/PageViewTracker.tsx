"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics/track";
import { ymHit } from "@/lib/analytics/metrika";

/**
 * Трекинг просмотров: на каждое изменение пути пишет page_views + событие
 * воронки view_page / view_product (через lib/analytics/track) и шлёт SPA-hit
 * в Я.Метрику (клиентские переходы). Fire-and-forget.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackPageView(pathname);
    // первый просмотр уже учтён init'ом Метрики — шлём hit только на SPA-переходах
    if (first.current) { first.current = false; return; }
    ymHit(pathname);
  }, [pathname]);
  return null;
}
