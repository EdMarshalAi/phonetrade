"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("pt:sid");
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("pt:sid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Лёгкий трекинг просмотров: на каждое изменение пути пишет строку в
 * page_views через anon-клиент (RLS разрешает anon insert). Fire-and-forget,
 * не блокирует рендер и молча игнорирует ошибки. Админка читает агрегаты.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!supabase) return;
    const sid = sessionId();
    void supabase
      .from("page_views")
      .insert({
        path: pathname,
        referrer: document.referrer || null,
        session_id: sid,
        user_agent: navigator.userAgent,
      })
      .then(() => {});
  }, [pathname]);
  return null;
}
