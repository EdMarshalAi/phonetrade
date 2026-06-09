"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Считает просмотр статьи блога: один раз за сессию на статью (sessionStorage),
 * не от ботов. Инкремент — через RPC increment_blog_views (SECURITY DEFINER),
 * fire-and-forget. Реальные просмотры суммируются поверх стартовой базы.
 */
export function BlogViewPing({ slug }: { slug: string }) {
  React.useEffect(() => {
    if (!supabase || !slug) return;
    // не считаем автоматизацию
    if (typeof navigator !== "undefined" && (navigator as Navigator & { webdriver?: boolean }).webdriver) return;
    try {
      const key = `pt:blogviewed:${slug}`;
      if (sessionStorage.getItem(key)) return; // в рамках сессии не двоим
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    void supabase.rpc("increment_blog_views", { p_slug: slug }).then(() => {});
  }, [slug]);
  return null;
}
