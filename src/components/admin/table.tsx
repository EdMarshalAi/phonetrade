import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Плотная таблица админки: sticky-заголовок, hairline-разделители,
 * hover-подсветка строк. Презентационные части (server-safe).
 */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <table className={cn("w-full border-collapse text-[14px]", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-surface/80 backdrop-blur-sm">
      <tr className="border-b border-border/70 text-left">{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.03em] text-ink-subtle", className)}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={cn("border-b border-border/50 last:border-0 transition-colors hover:bg-surface/60", className)}>
      {children}
    </tr>
  );
}

export function TD({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle text-ink", className)}>{children}</td>;
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-white px-6 py-14 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-ink-muted">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
