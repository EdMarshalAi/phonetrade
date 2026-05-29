import * as React from "react";
import type { SeoBlock } from "@/lib/catalog/category-config";
import { cn } from "@/lib/utils/cn";

type Props = {
  blocks: SeoBlock[];
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

export function CatalogSeo({ blocks }: Props) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <section
      aria-label="О категории"
      className="mt-20 md:mt-28 rounded-3xl bg-white border border-border/60 p-7 md:p-12"
    >
      <div className="space-y-10 md:space-y-14">
        {blocks.map((b, i) =>
          b.html ? (
            <article
              key={i}
              className={proseClass}
              dangerouslySetInnerHTML={{ __html: b.html }}
            />
          ) : (
            <article key={i} className={proseClass}>
              {b.heading && <h2>{b.heading}</h2>}
              {b.paragraphs?.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </article>
          )
        )}
      </div>
    </section>
  );
}
