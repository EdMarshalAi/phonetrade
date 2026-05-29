"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/analytics/track";

/**
 * Трекинг просмотров: на каждое изменение пути пишет page_views + событие
 * воронки view_page / view_product (через lib/analytics/track). Fire-and-forget.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackPageView(pathname);
  }, [pathname]);
  return null;
}
