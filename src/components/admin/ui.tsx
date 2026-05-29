import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Презентационные примитивы админки (server-safe, без хуков).
 * Плотный утилитарный минимализм: тонкие границы border/70, почти невидимые
 * тени, монохром на токенах globals.css (без хардкода hex). Радиусы — token
 * `rounded-md` (14px) для панелей, `rounded-sm` (10px) для контролов.
 */

/* ── Panel: белая карточка-контейнер ──────────────────────────────────── */
export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/70 bg-white",
        "shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-[15px] font-semibold tracking-tight text-ink", className)} {...props}>
      {children}
    </h2>
  );
}

/* ── PageHeader: заголовок страницы + описание + действия ──────────────── */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ── StatusBadge: монохромный бейдж статуса ───────────────────────────── */
const badgeTones = {
  neutral: "border-border/70 bg-surface text-ink-muted",
  strong: "border-transparent bg-ink text-white",
  outline: "border-border-strong bg-transparent text-ink",
  danger: "border-sale/25 bg-sale/5 text-sale",
} as const;

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof badgeTones;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-[11px] font-medium uppercase tracking-[0.04em]",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── PlaceholderSection: заглушка раздела (Фаза N) ────────────────────── */
export function PlaceholderSection({
  phase,
  note,
  icon: Icon,
}: {
  phase: string;
  note?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <Panel className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-surface">
          <Icon className="h-5 w-5 text-ink-subtle" strokeWidth={1.75} />
        </div>
      ) : null}
      <div>
        <p className="text-[15px] font-medium text-ink">Раздел в разработке</p>
        <p className="mt-1 text-sm text-ink-muted">
          Каркас готов. Функциональность подключается в&nbsp;{phase}.
        </p>
      </div>
      {note ? <p className="max-w-md text-sm text-ink-subtle">{note}</p> : null}
    </Panel>
  );
}
