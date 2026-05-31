import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru";

export const metadata: Metadata = {
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
  openGraph: {
    title: "PhoneTrade — Магазин техники Apple в Белгороде",
    description:
      "Оригинальная техника Apple с гарантией, Trade-in и сервисом. Белгород, ул. Попова, 36.",
    type: "website",
    locale: "ru_RU",
    siteName: "PhoneTrade",
    // og:image — из файловой конвенции src/app/opengraph-image.tsx (баннер 1200×630).
  },
  twitter: {
    card: "summary_large_image",
    title: "PhoneTrade — Магазин техники Apple в Белгороде",
    description: "Оригинальная техника Apple с гарантией, Trade-in и сервисом. Белгород, ул. Попова, 36.",
  },
};

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
