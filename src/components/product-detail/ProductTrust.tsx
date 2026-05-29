import * as React from "react";
import { resolveIcon } from "@/lib/admin/icons";
import type { InfoBlock } from "@/lib/content";

type Props = { blocks: InfoBlock[] };

/** Блоки под товаром (управляются в «Товары → Настройки → Блоки под товаром»). */
export function ProductTrust({ blocks }: Props) {
  return (
    <ul className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {blocks.map((c, i) => {
        const Icon = resolveIcon(c.icon);
        const ink = !!c.href; // блок со ссылкой выделяем тёмной плашкой (CTA)
        const Inner = (
          <article
            className={
              ink
                ? "h-full rounded-3xl bg-ink text-white p-6 md:p-7 transition-transform duration-300 ease-[var(--ease-apple)] hover:-translate-y-0.5"
                : "h-full rounded-3xl bg-white border border-border/60 p-6 md:p-7 transition-all duration-300 ease-[var(--ease-apple)] hover:border-ink/25 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.10)]"
            }
          >
            <span
              aria-hidden
              className={
                ink
                  ? "inline-flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white"
                  : "inline-flex size-11 items-center justify-center rounded-2xl bg-surface text-ink"
              }
            >
              <Icon className="size-5" />
            </span>
            <h3
              className={
                ink
                  ? "mt-5 text-lg font-semibold tracking-[-0.01em] text-white"
                  : "mt-5 text-lg font-semibold tracking-[-0.01em] text-ink"
              }
            >
              {c.title}
            </h3>
            <p
              className={
                ink
                  ? "mt-2 text-sm leading-relaxed text-onDark-muted"
                  : "mt-2 text-sm leading-relaxed text-ink-muted"
              }
            >
              {c.text}
            </p>
          </article>
        );
        return (
          <li key={`${c.title}-${i}`}>
            {c.href ? (
              <a href={c.href} className="block h-full">
                {Inner}
              </a>
            ) : (
              Inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
