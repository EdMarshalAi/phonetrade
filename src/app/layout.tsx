import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/providers/TooltipProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`h-full ${inter.variable}`}>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <AuthProvider>
          <TooltipProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
