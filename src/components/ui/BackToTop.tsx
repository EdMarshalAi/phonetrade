"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Кнопка «Наверх» для всего публичного сайта. Появляется после прокрутки
 * вниз (> 400px) и плавно скроллит к началу страницы. Слушатель скролла
 * с passive + rAF-троттлингом; анимация — только transform/opacity.
 */
export function BackToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let ticking = false;

    const update = () => {
      setVisible(window.scrollY > 400);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      aria-label="Наверх"
      onClick={scrollToTop}
      className={cn(
        "fixed bottom-5 right-5 z-40 inline-flex size-11 items-center justify-center rounded-full",
        "border border-white/40 bg-ink text-white shadow-lg shadow-ink/20",
        "transition-[opacity,transform] duration-300 ease-[var(--ease-apple)]",
        "hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ArrowUp className="size-5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
