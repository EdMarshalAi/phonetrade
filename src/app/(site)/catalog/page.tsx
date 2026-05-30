import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getCategories } from "@/lib/products";
import { getProductsByCategory } from "@/lib/products";
import { getCategoryConfig } from "@/lib/catalog/category-config";
import { plural } from "@/lib/utils/plural";

export const metadata: Metadata = {
  title: "Каталог Apple — все категории",
  description:
    "iPhone, iPad, Mac, Apple Watch, AirPods и аксессуары с гарантией PhoneTrade в Белгороде.",
};

function formatCount(n: number): string {
  return `${n} ${plural(n, ["товар", "товара", "товаров"])}`;
}

export default async function CatalogPage() {
  const categories = await getCategories();
  const counts = await Promise.all(
    categories.map((c) => getProductsByCategory(c.slug).then((p) => p.length).catch(() => 0))
  );
  // Показываем все опубликованные категории (в т.ч. созданные в админке и пока пустые).
  const items = categories.map((c, i) => ({ ...c, count: counts[i], desc: getCategoryConfig(c.slug)?.description }));

  return (
    <section className="bg-bg">
      <div className="container-page pt-10 md:pt-14 pb-20 md:pb-28">
        <nav aria-label="Хлебные крошки" className="mb-4 flex items-center gap-1.5 text-xs text-ink-subtle">
          <Link href="/" className="transition-colors hover:text-ink">Главная</Link>
          <span aria-hidden>/</span>
          <span className="text-ink">Каталог</span>
        </nav>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink md:text-5xl">Каталог Apple</h1>
          <span className="text-xs uppercase tracking-[0.16em] text-ink-subtle">{categories.length} категорий</span>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted md:text-base">
          Вся техника Apple с гарантией, проверкой и сервисом в Белгороде. Выберите категорию.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-5">
          {items.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-white transition-all duration-300 ease-[var(--ease-apple)] hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.10)]"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface">
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt={c.title}
                      fill
                      sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                      className="object-contain p-6 transition-transform duration-500 ease-[var(--ease-apple)] group-hover:scale-[1.04]"
                      unoptimized
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">{c.title}</h2>
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted transition-colors duration-300 group-hover:bg-ink group-hover:text-white"
                    >
                      <ArrowUpRight className="size-4" strokeWidth={2} />
                    </span>
                  </div>
                  {c.subtitle ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted line-clamp-2">{c.subtitle}</p>
                  ) : null}
                  <span className="mt-4 text-[12px] uppercase tracking-[0.14em] text-ink-subtle">
                    {formatCount(c.count)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
