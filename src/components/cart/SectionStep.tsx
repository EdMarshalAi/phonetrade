import * as React from "react";

type Props = {
  step?: number | string;
  title: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function SectionStep({ step, title, hint, children, action }: Props) {
  return (
    <section className="relative rounded-3xl bg-white border border-border/60 p-5 md:p-7">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          {step !== undefined && (
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 text-[13px] font-semibold text-ink mt-0.5">
              {step}
            </span>
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {hint && (
              <p className="mt-1 text-[13px] text-ink-muted">{hint}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}
