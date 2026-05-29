import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
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
  return (
    <html lang="ru" className={`h-full ${inter.variable}`}>
      <body className="min-h-full bg-bg text-ink">{children}</body>
    </html>
  );
}
