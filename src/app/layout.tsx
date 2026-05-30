import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://31.129.97.8";

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
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "Store",
      name: "PhoneTrade",
      description: "Магазин техники Apple в Белгороде: iPhone, iPad, Mac, Apple Watch, AirPods. Trade-in, Б/У, гарантия и сервис.",
      url: SITE_URL,
      image: `${SITE_URL}/brand/logo-mark-white.png`,
      priceRange: "₽₽",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Белгород",
        streetAddress: "ул. Попова, 36",
        addressCountry: "RU",
      },
      areaServed: "Белгород",
    },
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
