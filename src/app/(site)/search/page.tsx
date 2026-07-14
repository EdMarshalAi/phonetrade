import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { searchProducts, getCategories } from "@/lib/products";
import { ProductCard } from "@/components/product/ProductCard";
import { SearchTracker } from "@/components/catalog/SearchTracker";
import { plural } from "@/lib/utils/plural";
import { categoryPath } from "@/lib/catalog/category-path";

export const dynamic = "force-dynamic";

function readQuery(sp: Record<string, string | string[] | undefined>): string {
  const raw = sp.q ?? sp["catalog-search"];
  return (Array.isArray(raw) ? raw[0] : raw ?? "").slice(0, 100).trim();
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const q = readQuery(await searchParams);
  return {
    title: q ? `Поиск: ${q}` : "Поиск по каталогу",
    description: "Поиск техники Apple в каталоге PhoneTrade.",
    robots: { index: false },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = readQuery(await searchParams);
  const results = q ? await searchProducts(q) : [];

  return (
    <section className="bg-bg">
      <div className="container-page pt-10 md:pt-14 pb-20 md:pb-28">
        <nav aria-label="Хлебные крошки" className="mb-4 flex items-center gap-1.5 text-xs text-ink-subtle">
          <Link href="/" className="transition-colors hover:text-ink">Главная</Link>
          <span aria-hidden>/</span>
          <span className="text-ink">Поиск</span>
        </nav>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">
            {q ? <>Результаты по запросу «{q}»</> : "Поиск по каталогу"}
          </h1>
          {q ? (
            <span className="text-xs uppercase tracking-[0.16em] text-ink-subtle">
              {results.length} {plural(results.length, ["результат", "результата", "результатов"])}
            </span>
          ) : null}
        </div>

        {q ? <SearchTracker query={q} count={results.length} /> : null}

        {!q ? (
          <EmptyPrompt />
        ) : results.length === 0 ? (
          <NoResults query={q} />
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5">
            {results.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} className="h-full" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function EmptyPrompt() {
  return (
    <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-white px-6 py-16 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface text-ink-muted">
        <SearchIcon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 text-base font-medium text-ink">Введите запрос в строке поиска</p>
      <p className="mt-1.5 max-w-md text-sm text-ink-muted">
        Например: «iPhone 17 Pro», «MacBook Air», «AirPods» — ищем по названию, модели, цвету и объёму памяти.
      </p>
      <Link
        href="/catalog"
        className="mt-6 inline-flex h-10 items-center rounded-xl bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
      >
        Перейти в каталог
      </Link>
    </div>
  );
}

async function NoResults({ query }: { query: string }) {
  const categories = await getCategories();
  return (
    <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-white px-6 py-16 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface text-ink-muted">
        <SearchIcon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 text-base font-medium text-ink">По запросу «{query}» ничего не нашлось</p>
      <p className="mt-1.5 max-w-md text-sm text-ink-muted">
        Проверьте раскладку и опечатки или загляните в одну из категорий.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {categories.slice(0, 7).map((c) => (
          <Link
            key={c.slug}
            href={categoryPath(c.slug)}
            className="inline-flex h-9 items-center rounded-full border border-border/70 bg-white px-4 text-sm text-ink transition-colors hover:border-ink/30 hover:bg-surface"
          >
            {c.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
