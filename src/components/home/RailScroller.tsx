"use client";

import * as React from "react";

/**
 * Горизонтальный скролл-контейнер товарного ряда с подсказкой-«толчком» на
 * мобильных: когда ряд впервые попадает в зону видимости, он слегка съезжает
 * вправо и возвращается обратно — намёк, что карточки листаются вбок.
 * На десктопе (≥768px) и при prefers-reduced-motion толчка нет.
 */
export function RailScroller({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let nudged = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || nudged) continue;
          if (el.scrollWidth <= el.clientWidth + 8) continue; // нечего листать
          nudged = true;
          const dist = Math.min(56, el.scrollWidth - el.clientWidth);
          el.scrollTo({ left: dist, behavior: "smooth" });
          window.setTimeout(() => el.scrollTo({ left: 0, behavior: "smooth" }), 600);
          io.disconnect();
        }
      },
      { threshold: 0.45 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
