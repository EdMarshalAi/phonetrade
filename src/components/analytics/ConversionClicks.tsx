"use client";

import * as React from "react";
import { ymReachGoal } from "@/lib/analytics/metrika";

/**
 * Делегированный трекинг кликов-конверсий по всему сайту (без правки каждой
 * ссылки): звонок по телефону (`tel:`) и переходы в мессенджеры/соцсети
 * (WhatsApp, Telegram, VK). Цели Я.Метрики: `call`, `messenger`.
 */
export function ConversionClicks() {
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (href.startsWith("tel:")) {
        ymReachGoal("call");
      } else if (/(?:wa\.me|api\.whatsapp\.com|whatsapp:|t\.me|telegram\.me|tg:\/\/|vk\.com|vk\.me)/i.test(href)) {
        ymReachGoal("messenger");
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
