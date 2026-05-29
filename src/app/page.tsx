import { Hero, type HeroSlide } from "@/components/home/Hero";
import { BentoCategories } from "@/components/home/BentoCategories";
import { ProductRail } from "@/components/home/ProductRail";
import { TradeInPromo } from "@/components/home/TradeInPromo";
import { TradeInSteps } from "@/components/home/TradeInSteps";
import { BrandMarquee } from "@/components/home/BrandMarquee";
import { BlogTeaser } from "@/components/home/BlogTeaser";
import { WhyAndFaq } from "@/components/home/WhyAndFaq";
import {
  getCategories,
  getFeaturedCatalog,
  getFeaturedIphones,
  getUsedProducts,
} from "@/lib/products";

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
  const [categories, iphones, catalog, used] = await Promise.all([
    getCategories(),
    getFeaturedIphones(),
    getFeaturedCatalog(),
    getUsedProducts(),
  ]);

  return (
    <>
      <Hero slides={HERO_SLIDES} />
      <BentoCategories categories={categories} />
      <ProductRail
        eyebrow="Свежее в магазине"
        title="Новинки iPhone"
        href="/category/iphone"
        products={iphones}
      />
      <ProductRail
        eyebrow="Каталог техники"
        title="iPad, Mac, Watch"
        href="/catalog"
        products={catalog}
        bg="surface"
      />
      <ProductRail
        eyebrow="Доступнее"
        title="Б/У техника Apple"
        href="/used"
        products={used}
      />
      <TradeInPromo />
      <TradeInSteps />
      <BrandMarquee />
      <BlogTeaser />
      <WhyAndFaq />
    </>
  );
}
