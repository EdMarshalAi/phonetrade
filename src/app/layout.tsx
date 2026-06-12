import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getWebmasterVerification } from "@/lib/content";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru";

// OG-превью для соцсетей — фото магазина со страницы «О компании».
const OG_IMAGE =
  "https://giwehapapi.beget.app/storage/v1/object/public/product-images/content/store-belgorod.jpg";

export async function generateMetadata(): Promise<Metadata> {
  // Коды подтверждения прав в вебмастерах редактируются в админке
  // (Настройки → Интеграции → «Верификация в вебмастерах»); фолбэк — захардкожен.
  const wm = await getWebmasterVerification();
  return {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PhoneTrade — Магазин техники Apple в Белгороде",
    template: "%s · PhoneTrade",
  },
  description:
    "Оригинальная техника Apple в Белгороде: iPhone, iPad, Mac, Apple Watch, AirPods. Trade-in, Б/У, гарантия и собственный сервис. ул. Попова, 36.",
  keywords: [
    "iPhone Белгород",
    "Apple Белгород",
    "купить iPhone Белгород",
    "Trade-in iPhone",
    "PhoneTrade",
  ],
  // Подтверждение прав в вебмастерах (рендерит <meta> в <head> на всех страницах):
  // Яндекс — yandex-verification, Bing — msvalidate.01 (нужен для ChatGPT/SearchGPT).
  verification: {
    ...(wm.yandex ? { yandex: wm.yandex } : {}),
    ...(wm.bing ? { other: { "msvalidate.01": wm.bing } } : {}),
  },
  openGraph: {
    title: "PhoneTrade — Магазин техники Apple в Белгороде",
    description:
      "Оригинальная техника Apple с гарантией, Trade-in и сервисом. Белгород, ул. Попова, 36.",
    type: "website",
    locale: "ru_RU",
    siteName: "PhoneTrade",
    // Реальное фото магазина (страница «О компании») — лучше заходит в соцсетях
    // (Telegram/ВК), чем сгенерированный баннер. Ссылаемся явно, иначе тег
    // og:image не подхватывается из-за route-группы (site).
    images: [{ url: OG_IMAGE, width: 1400, height: 1400, alt: "PhoneTrade — магазин техники Apple в Белгороде, ул. Попова, 36" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PhoneTrade — Магазин техники Apple в Белгороде",
    description: "Оригинальная техника Apple с гарантией, Trade-in и сервисом. Белгород, ул. Попова, 36.",
    images: [OG_IMAGE],
  },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d1d1f",
};

/**
 * Корневой layout — только <html>/<body>, шрифт и глобальные метаданные.
 * Публичная обвязка (Header/Footer, провайдеры) живёт в route group `(site)`,
 * админка — в `(admin)` со своим шеллом без публичной шапки.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Организация (LocalBusiness) рендерится в (site)/layout из shop_settings с @id.
  // В корне — только WebSite+SearchAction (нужен на всех публичных страницах).
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PhoneTrade",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];
  return (
    <html lang="ru" className={`h-full ${inter.variable}`}>
      <body className="min-h-full bg-bg text-ink">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        {children}
      </body>
    </html>
  );
}
