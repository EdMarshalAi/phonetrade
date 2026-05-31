import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightLeft,
  Clock,
  CreditCard,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { getShopContacts } from "@/lib/content";
import { ContactLinks } from "@/components/layout/ContactLinks";
import { MotionReveal, MotionStagger, MotionItem } from "@/components/ui/MotionReveal";

const STORE_PHOTO =
  "https://giwehapapi.beget.app/storage/v1/object/public/product-images/content/store-belgorod.jpg";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://31.129.97.8").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "О компании — техника Apple в Белгороде | PhoneTrade",
  description:
    "PhoneTrade — магазин оригинальной техники Apple в Белгороде на ул. Попова, 36. Купить iPhone, iPad, MacBook, Apple Watch и AirPods с гарантией, доставкой по городу и РФ, рассрочкой и собственным сервисным центром.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "О компании PhoneTrade — техника Apple в Белгороде",
    description:
      "Оригинальная техника Apple в Белгороде с гарантией, доставкой, рассрочкой и собственным сервисным центром.",
    url: "/about",
    type: "website",
    images: [STORE_PHOTO],
  },
};

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Только оригинал",
    text: "Каждое устройство проходит проверку подлинности. Серийный номер можно сверить с базой Apple прямо в магазине.",
  },
  {
    icon: Wrench,
    title: "Свой сервис в Белгороде",
    text: "Диагностика и ремонт на месте — без отправки в другие города и долгого ожидания запчастей.",
  },
  {
    icon: Truck,
    title: "Доставка и самовывоз",
    text: "Забрать заказ можно в Универмаге «Белгород» или оформить доставку по Белгороду и всей России.",
  },
  {
    icon: CreditCard,
    title: "Рассрочка и оплата картой",
    text: "Наличные, банковские карты VISA / MasterCard / МИР и рассрочка от Т-Банк до 36 месяцев.",
  },
  {
    icon: ArrowRightLeft,
    title: "Trade-in с зачётом",
    text: "Принимаем iPhone, iPad, Mac, Watch и AirPods — сумма обмена сразу учитывается в покупке.",
  },
  {
    icon: HeartHandshake,
    title: "Поддержка после покупки",
    text: "Настроим Apple ID, перенесём данные, поможем по гарантии. Звоните или приходите в магазин.",
  },
];

const STATS = [
  { value: "7+ лет", label: "работаем в Белгороде" },
  { value: "300+", label: "моделей в наличии" },
  { value: "0-0-0", label: "рассрочка от Т-Банк" },
  { value: "Свой", label: "сервисный центр" },
];

export default async function AboutPage() {
  const contacts = await getShopContacts();
  const address = contacts?.address || "Белгород, ул. Попова, 36 (Универмаг «Белгород», 1 этаж)";
  const hours = contacts?.working_hours || "Ежедневно 10:00–20:00";
  const phone = contacts?.phone || "+7 (904) 098-88-77";
  const phone2 = contacts?.phone2?.trim();
  const email = contacts?.email?.trim();
  const mapLink =
    "https://yandex.ru/maps/?text=%D0%91%D0%B5%D0%BB%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%2C%20%D1%83%D0%BB.%20%D0%9F%D0%BE%D0%BF%D0%BE%D0%B2%D0%B0%2C%2036";

  const storeLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: "PhoneTrade",
    description:
      "Магазин оригинальной техники Apple в Белгороде: iPhone, iPad, MacBook, Apple Watch, AirPods. Гарантия, доставка, рассрочка, собственный сервисный центр.",
    image: STORE_PHOTO,
    url: `${SITE_URL}/about`,
    telephone: phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Попова, 36",
      addressLocality: "Белгород",
      addressCountry: "RU",
    },
    openingHours: "Mo-Su 10:00-20:00",
    priceRange: "₽₽",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(storeLd) }} />

      {/* Hero: текст слева, фото справа */}
      <section className="bg-surface">
        <div className="container-page py-16 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <MotionReveal>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                О компании
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink md:text-5xl">
                Айфоны и техника Apple в&nbsp;Белгороде
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-muted">
                PhoneTrade — магазин оригинальной техники Apple в Белгороде. У нас можно купить
                iPhone, iPad, MacBook, Apple Watch, AirPods и оригинальные аксессуары с официальной
                гарантией. Все устройства проходят проверку, имеют подтверждённую оригинальность и
                поддерживаются нашим собственным сервисным центром.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/catalog"
                  className="inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-medium text-white transition-colors hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
                >
                  Смотреть каталог
                </Link>
                <Link
                  href="/trade-in"
                  className="inline-flex h-12 items-center rounded-full border border-border px-7 text-sm font-medium text-ink transition-colors hover:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                >
                  Оценить Trade-in
                </Link>
              </div>
            </MotionReveal>

            <MotionReveal delay={0.1}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-white ring-1 ring-border/60">
                <Image
                  src={STORE_PHOTO}
                  alt="Магазин Phone Trade в Белгороде — ул. Попова, 36"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 50vw"
                />
              </div>
            </MotionReveal>
          </div>

          {/* Цифры */}
          <MotionStagger className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border/60 bg-border/60 md:grid-cols-4">
            {STATS.map((s) => (
              <MotionItem key={s.label} className="bg-white p-6 text-center">
                <p className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{s.value}</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-muted">{s.label}</p>
              </MotionItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* Почему выбирают */}
      <section className="bg-white">
        <div className="container-page py-20 md:py-28">
          <MotionReveal>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">
              Почему покупают у нас
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
              Благодаря прямым поставкам цены ниже среднерыночных, а постоянные покупатели получают
              накопительные скидки и бонусы. При комплексной покупке — дополнительная выгода.
            </p>
          </MotionReveal>

          <MotionStagger className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <MotionItem key={f.title} className="bg-white p-7">
                <span
                  aria-hidden
                  className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface text-ink"
                >
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{f.text}</p>
              </MotionItem>
            ))}
          </MotionStagger>
        </div>
      </section>

      {/* Команда / гарантии */}
      <section className="bg-surface">
        <div className="container-page py-20 md:py-28">
          <MotionReveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">
              Команда с опытом и честным сервисом
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-ink-muted">
              У нас работает команда специалистов с большим опытом. Более семи лет мы помогаем
              жителям Белгорода выбирать технику Apple и заботимся о ней после покупки. Наша
              успешная работа подтверждается отзывами и рекомендациями — и мы постоянно ищем, как
              стать лучше.
            </p>
            <div className="mt-8 inline-flex flex-col gap-2 text-left text-[15px] text-ink">
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="size-[18px] text-ink" aria-hidden /> Быструю диагностику устройств и ремонт
              </span>
              <span className="flex items-center gap-2.5">
                <Truck className="size-[18px] text-ink" aria-hidden /> Доставку товаров по Белгороду и РФ
              </span>
            </div>
            <p className="mt-8 text-[13px] text-ink-subtle">
              * Актуальную цену и наличие интересующей вас модели уточняйте в сообщениях или по телефону.
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* Контакты + соцсети */}
      <section className="bg-white">
        <div className="container-page py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <MotionReveal>
              <h2 className="text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Контакты</h2>
              <ul className="mt-7 space-y-5 text-[15px]">
                <li className="flex items-start gap-3.5">
                  <span aria-hidden className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-ink">
                    <MapPin className="size-4" />
                  </span>
                  <span className="pt-1.5 text-ink">{address}</span>
                </li>
                <li className="flex items-start gap-3.5">
                  <span aria-hidden className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-ink">
                    <Clock className="size-4" />
                  </span>
                  <span className="pt-1.5 text-ink">{hours}</span>
                </li>
                <li className="flex items-start gap-3.5">
                  <span aria-hidden className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-ink">
                    <Phone className="size-4" />
                  </span>
                  <span className="flex flex-col pt-1.5">
                    <a href={`tel:+${phone.replace(/\D/g, "")}`} className="font-medium text-ink hover:underline">{phone}</a>
                    {phone2 ? (
                      <a href={`tel:+${phone2.replace(/\D/g, "")}`} className="mt-1 font-medium text-ink hover:underline">{phone2}</a>
                    ) : null}
                  </span>
                </li>
                {email ? (
                  <li className="flex items-start gap-3.5">
                    <span aria-hidden className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border/70 text-ink">
                      <Mail className="size-4" />
                    </span>
                    <a href={`mailto:${email}`} className="pt-1.5 text-ink hover:underline">{email}</a>
                  </li>
                ) : null}
              </ul>

              <div className="mt-8">
                <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-ink-muted">Мы на связи</p>
                <ContactLinks
                  contacts={contacts?.contacts}
                  location="footer"
                  className="mt-3 flex items-center gap-2.5"
                  itemClassName="inline-flex size-11 items-center justify-center rounded-xl bg-surface text-ink transition-colors hover:bg-ink hover:text-white"
                  iconClassName="size-[18px]"
                />
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-medium text-white transition-colors hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
                >
                  Построить маршрут
                </a>
                <Link
                  href="/catalog"
                  className="inline-flex h-12 items-center rounded-full border border-border px-7 text-sm font-medium text-ink transition-colors hover:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                >
                  В каталог
                </Link>
              </div>
            </MotionReveal>

            <MotionReveal delay={0.1}>
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Открыть на Яндекс.Картах"
                className="block overflow-hidden rounded-3xl border border-border/60 bg-surface"
              >
                <iframe
                  src="https://yandex.ru/map-widget/v1/?ll=36.594843%2C50.595414&z=17&mode=search&text=%D0%91%D0%B5%D0%BB%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%2C%20%D1%83%D0%BB.%20%D0%9F%D0%BE%D0%BF%D0%BE%D0%B2%D0%B0%2C%2036"
                  title="PhoneTrade на карте — Белгород, ул. Попова, 36"
                  loading="lazy"
                  className="block h-[320px] w-full border-0 grayscale-[0.15] contrast-[0.95] md:h-full md:min-h-[420px]"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </a>
            </MotionReveal>
          </div>
        </div>
      </section>
    </>
  );
}
