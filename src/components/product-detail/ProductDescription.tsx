import * as React from "react";
import type { ProductDescription as DescBlock } from "@/lib/data/products";
import { cn } from "@/lib/utils/cn";
import { sanitizeRichHtml } from "@/lib/utils/sanitize-html";

type Props = {
  blocks: DescBlock[];
  productTitle: string;
};

const proseClass = cn(
  "prose prose-neutral max-w-none",
  "prose-headings:text-ink prose-headings:font-semibold prose-headings:tracking-[-0.01em]",
  "prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-0 prose-h2:mb-4",
  "prose-h3:text-lg md:prose-h3:text-xl",
  "prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-ink-muted",
  "prose-li:text-[15px] prose-li:leading-relaxed prose-li:text-ink-muted",
  "prose-a:text-ink prose-a:underline-offset-4 hover:prose-a:opacity-70",
  "prose-strong:text-ink prose-strong:font-semibold",
  "prose-table:text-sm prose-th:text-ink prose-td:text-ink-muted",
  "prose-hr:border-border/60"
);

export function ProductDescription({ blocks, productTitle }: Props) {
  return (
    <article>
      <header className="mb-10 md:mb-12">
        <span className="block text-xs uppercase tracking-[0.18em] text-ink-subtle mb-3">
          О товаре
        </span>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-ink">
          Подробно о {productTitle}
        </h2>
      </header>

      <div className="space-y-10 md:space-y-14">
        {blocks.map((b, i) =>
          b.html ? (
            <section
              key={i}
              className={proseClass}
              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(b.html) }}
            />
          ) : (
            <section key={i} className={proseClass}>
              {b.heading && <h3>{b.heading}</h3>}
              {b.paragraphs?.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </section>
          )
        )}
      </div>
    </article>
  );
}
