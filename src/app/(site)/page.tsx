import type { Metadata } from "next";
import { Hero, type HeroSlide } from "@/components/home/Hero";
import { BentoCategories } from "@/components/home/BentoCategories";
import { ProductRail } from "@/components/home/ProductRail";
import { TradeInPromo } from "@/components/home/TradeInPromo";
import { TradeInSteps } from "@/components/home/TradeInSteps";
import { BrandMarquee } from "@/components/home/BrandMarquee";
import { BlogTeaser } from "@/components/home/BlogTeaser";
import { WhyAndFaq } from "@/components/home/WhyAndFaq";

const OG_IMAGE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/content/store-belgorod.jpg";
export const metadata: Metadata = {
  alternates: { canonical: "/" },
  // Задаём og:image явно: переопределение openGraph на странице глушит наследование images из корневого layout.
  openGraph: { url: "/", images: [{ url: OG_IMAGE, width: 1400, height: 1400, alt: "PhoneTrade — магазин техники Apple в Белгороде, ул. Попова, 36" }] },
};
import {
  getCategories,
  getFeaturedCatalog,
  getFeaturedIphones,
  getUsedProducts,
} from "@/lib/products";
import {
  getHeroSlides,
  getAdvantages,
  getBrands,
  getTradeInBlock,
  getTradeInSteps,
  getBlogPosts,
  getBentoTiles,
  getHomeBlocksVisibility,
  getHomeCategoryRails,
} from "@/lib/content";

// ISR: обновлять главную каждые 10 минут, чтобы изменения данных в БД (фото,
// цены, новые товары) появлялись без редеплоя. Правки из админки дополнительно
// сбрасывают кэш через revalidatePath("/").
export const revalidate = 600;

/**
 * Слайды баннера. Когда сделаем админку — этот массив будет тянуться из БД,
 * админ добавляет фон / эйбро / заголовок / подзаголовок / кнопку / картинку.
 */
const HERO_SLIDES: HeroSlide[] = [
  {
    id: "iphone-17-pro",
    background: "ink",
    textTone: "light",
    eyebrow: "Новинка осени",
    title: "iPhone 17 Pro",
    subtitle:
      "Титановый корпус, чип A19 Pro и переработанная камера. От 99 000 ₽ наличными.",
    cta: { label: "Узнать подробнее", href: "/category/iphone" },
    image: "/categories/iphone-cutout.png?v=3",
  },
  {
    id: "macbook-air-m4",
    background: "surface",
    textTone: "dark",
    eyebrow: "Свежая Mac-линейка",
    title: "MacBook Air M4",
    subtitle:
      "Тонкий корпус, до 18 часов работы и чип M4 для всего, что задумали. От 134 000 ₽.",
    cta: { label: "Смотреть Mac", href: "/category/mac" },
    image: "/categories/mac-cutout.png?v=3",
  },
  {
    id: "trade-in",
    background: "ink",
    textTone: "light",
    eyebrow: "Trade-in без задержек",
    title: "Сдай старое — получи скидку",
    subtitle:
      "Принимаем iPhone, iPad, Mac, Watch и AirPods. Оценка за 15 минут, сумма сразу учитывается в покупке.",
    cta: { label: "Узнать вашу скидку", href: "/trade-in" },
    image: "/categories/accessories-cutout.png?v=3",
  },
  {
    id: "ipad-pro-m5",
    background: "white",
    textTone: "dark",
    eyebrow: "iPad Pro M5",
    title: "Pro для всех",
    subtitle:
      "ProMotion-дисплей, чип M5 и Magic Keyboard с floating-design. Подберём под ваши задачи.",
    cta: { label: "Смотреть iPad", href: "/category/ipad" },
    image: "/categories/ipad-cutout.png?v=3",
  },
];

export default async function HomePage() {
  const [categories, iphones, catalog, used, heroRows, advantageRows, brandRows, tiBlock, tiSteps, blogRows, bentoRows, blocks, categoryRails] =
    await Promise.all([
      getCategories(),
      getFeaturedIphones(),
      getFeaturedCatalog(),
      getUsedProducts(),
      getHeroSlides(),
      getAdvantages(),
      getBrands(),
      getTradeInBlock(),
      getTradeInSteps(),
      getBlogPosts(6),
      getBentoTiles(),
      getHomeBlocksVisibility(),
      getHomeCategoryRails(),
    ]);

  const features =
    advantageRows.length > 0
      ? advantageRows.map((a) => ({ icon: a.icon, title: a.title, text: a.description ?? "" }))
      : undefined;
  const brandItems =
    brandRows.length > 0 ? brandRows.map((b) => ({ title: b.title, logoUrl: b.logo_url })) : undefined;
  const tradeInBlock = tiBlock
    ? {
        title: tiBlock.block_title,
        description: tiBlock.block_description ?? "",
        buttonText: tiBlock.button_text ?? "Узнать вашу скидку",
        buttonLink: tiBlock.button_link ?? "/trade-in",
        imageUrl: tiBlock.image_url,
      }
    : undefined;
  const tradeInSteps =
    tiSteps.length > 0
      ? tiSteps.map((s) => ({ n: s.step_number, title: s.title, description: s.description ?? "" }))
      : undefined;
  const blogPosts =
    blogRows.length > 0
      ? blogRows.map((p) => ({
          id: p.id,
          title: p.title,
          date: p.published_at ? new Date(p.published_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) : "",
          views: p.views ?? 0,
          category: p.category ?? "Гаджеты",
          image: p.cover_url ?? `https://picsum.photos/seed/${p.slug}/1200/800`,
          href: `/blog/${p.slug}`,
        }))
      : undefined;

  // Слайды из админки (если заведены) → формат Hero; иначе дефолтные.
  const heroSlides: HeroSlide[] =
    heroRows.length > 0
      ? heroRows.map((r) => ({
          id: r.id,
          background: r.bg_color || (r.theme === "light" ? "white" : "ink"),
          textTone: r.theme === "light" ? "dark" : "light",
          eyebrow: r.overline ?? undefined,
          title: r.title,
          subtitle: r.description ?? undefined,
          cta: r.button_text && r.button_link ? { label: r.button_text, href: r.button_link } : undefined,
          image: r.image_url ?? undefined,
        }))
      : HERO_SLIDES;

  return (
    <>
      <Hero slides={heroSlides} />
      {blocks.bento ? <BentoCategories categories={categories} tiles={bentoRows} /> : null}
      {categoryRails.length > 0 ? (
        categoryRails.map((rail, i) => (
          <ProductRail
            key={rail.slug}
            eyebrow="Категория"
            title={rail.title}
            href={`/category/${rail.slug}`}
            products={rail.products}
            bg={i % 2 === 1 ? "surface" : undefined}
          />
        ))
      ) : (
        <>
          <ProductRail eyebrow="Свежее в магазине" title="Новинки iPhone" href="/category/iphone" products={iphones} />
          <ProductRail eyebrow="Каталог техники" title="iPad, Mac, Watch" href="/catalog" products={catalog} bg="surface" />
          <ProductRail eyebrow="Доступнее" title="Б/У техника Apple" href="/used" products={used} />
        </>
      )}
      {blocks.trade_in ? (
        <>
          <TradeInPromo block={tradeInBlock} />
          <TradeInSteps steps={tradeInSteps} />
        </>
      ) : null}
      <BrandMarquee items={brandItems} />
      <BlogTeaser posts={blogPosts} />
      {blocks.advantages ? <WhyAndFaq features={features} /> : null}
    </>
  );
}
