import * as React from "react";
import Image from "next/image";
import { BentoCard, type BentoCardSize } from "@/components/ui/BentoCard";
import { MotionReveal } from "@/components/ui/MotionReveal";
import type { Category } from "@/lib/data/products";
import type { BentoTileRow } from "@/lib/content";

type Props = {
  categories: Category[];
  /** Плитки из админки (bento_tiles). Если заданы — рендерим их; иначе дефолт по категориям. */
  tiles?: BentoTileRow[];
};

type TileLayout = {
  slug: Category["slug"];
  size: BentoCardSize;
  tone: "light" | "surface" | "ink";
  span: string;
};

const LAYOUT: TileLayout[] = [
  { slug: "iphone", size: "xl", tone: "ink", span: "sm:col-span-2 lg:col-span-4 lg:row-span-2" },
  { slug: "mac", size: "lg", tone: "light", span: "sm:col-span-2 lg:col-span-2 lg:row-span-2" },
  { slug: "ipad", size: "md", tone: "surface", span: "sm:col-span-1 lg:col-span-2" },
  { slug: "watch", size: "md", tone: "light", span: "sm:col-span-1 lg:col-span-2" },
  { slug: "accessories", size: "md", tone: "surface", span: "sm:col-span-1 lg:col-span-2" },
];

/** Размер плитки админки → размер/спан BentoCard. */
const SIZE_MAP: Record<BentoTileRow["size"], { size: BentoCardSize; span: string }> = {
  large: { size: "xl", span: "sm:col-span-2 lg:col-span-4 lg:row-span-2" },
  medium: { size: "lg", span: "sm:col-span-2 lg:col-span-2 lg:row-span-2" },
  small: { size: "md", span: "sm:col-span-1 lg:col-span-2" },
};

function Header() {
  return (
    <MotionReveal>
      <header className="mb-10 md:mb-14 flex items-end justify-between gap-6 flex-wrap">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.02] text-ink">
          Каталог Apple
        </h2>
        <p className="text-sm md:text-base text-ink-muted max-w-md">
          Полная линейка устройств — с гарантией, проверкой и сервисом в Белгороде.
        </p>
      </header>
    </MotionReveal>
  );
}

export function BentoCategories({ categories, tiles }: Props) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  // ── Плитки из админки ──────────────────────────────────────────────────
  if (tiles && tiles.length > 0) {
    return (
      <section className="bg-surface">
        <div className="container-page py-16 md:py-24">
          <Header />
          <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-auto">
            {tiles.map((t) => {
              const { size, span } = SIZE_MAP[t.size] ?? SIZE_MAP.medium;
              const title = t.custom_title || t.category_title || "Категория";
              // Картинка плитки задаётся здесь же, в «Блоки на главной → Bento-плитки»
              // (custom_image_url) — это главный источник. Если не задана — берём
              // картинку категории как фолбэк.
              const image = t.custom_image_url || t.category_image || null;
              const href = t.category_slug ? `/category/${t.category_slug}` : "#";
              return (
                <BentoCard
                  key={t.id}
                  title={title}
                  description={t.subtitle ?? undefined}
                  href={href}
                  size={size}
                  tone={t.theme === "dark" ? "ink" : "light"}
                  className={span}
                  image={
                    image ? (
                      <Image
                        src={image}
                        alt={title}
                        fill
                        sizes="(min-width: 1024px) 50vw, 90vw"
                        className="object-contain object-bottom-right drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ── Дефолт: раскладка по категориям ────────────────────────────────────
  return (
    <section className="bg-surface">
      <div className="container-page py-16 md:py-24">
        <Header />
        <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-auto">
          {LAYOUT.map((tile) => {
            const cat = bySlug.get(tile.slug);
            if (!cat) return null;
            return (
              <BentoCard
                key={cat.id}
                title={cat.title}
                description={cat.subtitle}
                href={`/category/${cat.slug}`}
                size={tile.size}
                tone={tile.tone}
                className={tile.span}
                image={
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    sizes="(min-width: 1024px) 50vw, 90vw"
                    className="object-contain object-bottom-right drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
                  />
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
