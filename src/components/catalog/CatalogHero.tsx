import * as React from "react";
import { ChevronRight } from "lucide-react";

type Props = {
  title: string;
  description: string;
  total: number;
};

function formatTotal(n: number): string {
  const last = n % 10;
  const last2 = n % 100;
  if (last === 1 && last2 !== 11) return `${n} товар`;
  if ([2, 3, 4].includes(last) && ![12, 13, 14].includes(last2))
    return `${n} товара`;
  return `${n} товаров`;
}

export function CatalogHero({ title, description, total }: Props) {
  return (
    <section className="bg-bg">
      <div className="container-page pt-10 md:pt-14 pb-6 md:pb-8">
        <nav
          aria-label="Хлебные крошки"
          className="flex items-center gap-1.5 text-xs text-ink-subtle mb-4"
        >
          <a href="/" className="hover:text-ink transition-colors">
            Главная
          </a>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="text-ink">{title}</span>
        </nav>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink">
          {title}
        </h1>
        <p className="mt-3 text-sm md:text-base text-ink-muted max-w-2xl">
          {description}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-ink-subtle">
          {formatTotal(total)}
        </p>
      </div>
    </section>
  );
}
