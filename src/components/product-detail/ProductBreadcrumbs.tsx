import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCategories } from "@/lib/products";
import type { Product } from "@/lib/data/products";

type Props = { product: Product };

/** Хлебные крошки товара. Категория и её родитель берутся из БД (без хардкода). */
export async function ProductBreadcrumbs({ product }: Props) {
  const cats = await getCategories().catch(() => []);
  const cat = cats.find((c) => c.slug === product.categorySlug);
  const parent = cat?.parentSlug ? cats.find((c) => c.slug === cat.parentSlug) : null;

  return (
    <nav
      aria-label="Хлебные крошки"
      className="flex items-center flex-wrap gap-1.5 text-xs text-ink-subtle"
    >
      <Link href="/" className="hover:text-ink transition-colors">Главная</Link>
      <ChevronRight className="size-3.5" aria-hidden />
      <Link href="/catalog" className="hover:text-ink transition-colors">Каталог</Link>
      {parent && (
        <>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link href={`/category/${parent.slug}`} className="hover:text-ink transition-colors">
            {parent.title}
          </Link>
        </>
      )}
      {cat && (
        <>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link href={`/category/${cat.slug}`} className="hover:text-ink transition-colors">
            {cat.title}
          </Link>
        </>
      )}
    </nav>
  );
}
