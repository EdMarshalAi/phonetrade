import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Props = {
  title: string;
  description: string;
  total: number;
  /** Родительская категория для хлебных крошек (если это подкатегория). */
  parent?: { title: string; href: string } | null;
};

function formatTotal(n: number): string {
  const last = n % 10;
  const last2 = n % 100;
  if (last === 1 && last2 !== 11) return `${n} товар`;
  if ([2, 3, 4].includes(last) && ![12, 13, 14].includes(last2))
    return `${n} товара`;
  return `${n} товаров`;
}

export function CatalogHero({ title, description, total, parent = null }: Props) {
  return (
    <section className="bg-bg">
      <div className="container-page pt-10 md:pt-14 pb-6 md:pb-8">
        <nav
          aria-label="Хлебные крошки"
          className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle mb-4"
        >
          <Link href="/" className="hover:text-ink transition-colors">
            Главная
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link href="/catalog" className="hover:text-ink transition-colors">
            Каталог
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          {parent ? (
            <>
              <Link href={parent.href} className="hover:text-ink transition-colors">
                {parent.title}
              </Link>
              <ChevronRight className="size-3.5" aria-hidden />
            </>
          ) : null}
          <span className="text-ink">{title}</span>
        </nav>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] text-ink">
            {title}
          </h1>
          <span className="text-xs uppercase tracking-[0.16em] text-ink-subtle">
            {formatTotal(total)}
          </span>
        </div>
        <p className="mt-3 text-sm md:text-base text-ink-muted max-w-2xl">
          {description}
        </p>
      </div>
    </section>
  );
}
