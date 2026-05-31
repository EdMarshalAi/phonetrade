import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Контейнер списка-карточек: hairline-границы, разделители между строками. */
export function ListCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("divide-y divide-border/60 overflow-hidden rounded-lg border border-border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]", className)}>
      {children}
    </div>
  );
}

/**
 * Кликабельная строка списка. Вся строка — ссылка на детальную страницу
 * (stretched-link), при этом кнопки в `actions` остаются кликабельными.
 */
export function LinkRow({
  href,
  children,
  actions,
}: {
  href: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="group relative flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface/50">
      <Link
        href={href}
        aria-label="Открыть"
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/20"
      />
      <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-4">{children}</div>
      {actions ? <div className="relative z-10 flex items-center gap-1.5">{actions}</div> : null}
      <ChevronRight className="relative z-0 h-4 w-4 shrink-0 text-ink-subtle/50 transition-colors group-hover:text-ink-muted" />
    </div>
  );
}
