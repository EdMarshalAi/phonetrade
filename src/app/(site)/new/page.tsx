import type { Metadata } from "next";
import Link from "next/link";
import { getNewProducts } from "@/lib/products";
import { ProductCard } from "@/components/product/ProductCard";
import { plural } from "@/lib/utils/plural";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Новинки Apple в Белгороде",
  description: "Новинки и свежие поступления техники Apple в Белгороде: iPhone, Mac, iPad, Watch, AirPods. Гарантия, доставка и самовывоз — PhoneTrade, ул. Попова, 36.",
  alternates: { canonical: "/new" },
  openGraph: { url: "/new", title: "Новинки Apple в Белгороде · PhoneTrade" },
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Новинки", item: `${SITE_URL}/new` },
  ],
};

export default async function NewArrivalsPage() {
  const products = await getNewProducts();

  return (
    <section className="bg-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <div className="container-page pt-10 md:pt-14 pb-20 md:pb-28">
        <nav aria-label="Хлебные крошки" className="mb-4 flex items-center gap-1.5 text-xs text-ink-subtle">
          <Link href="/" className="transition-colors hover:text-ink">Главная</Link>
          <span aria-hidden>/</span>
          <span className="text-ink">Новинки</span>
        </nav>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-4xl font-semibold tracking-[-0.03em] text-ink md:text-5xl">Новинки</h1>
          {products.length > 0 ? (
            <span className="text-xs uppercase tracking-[0.16em] text-ink-subtle">
              {products.length} {plural(products.length, ["модель", "модели", "моделей"])}
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted md:text-base">
          Последние поступления Apple — свежие линейки iPhone, Mac, iPad и аксессуаров с гарантией PhoneTrade.
        </p>

        {products.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-white px-6 py-16 text-center">
            <p className="text-base font-medium text-ink">Пока нет товаров с пометкой «Новинка»</p>
            <p className="mt-1.5 max-w-md text-sm text-ink-muted">Загляните в полный каталог — там вся актуальная техника Apple.</p>
            <Link href="/catalog" className="mt-6 inline-flex h-10 items-center rounded-xl bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink/90">
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5">
            {products.map((p) => (
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
