import { TooltipProvider } from "@/components/providers/TooltipProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CartProvider } from "@/components/providers/CartProvider";
import { FavoritesProvider } from "@/components/providers/FavoritesProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { BackToTop } from "@/components/ui/BackToTop";
import { BadgeRegistryProvider } from "@/components/product/ProductBadges";
import { CardSettingsProvider } from "@/components/product/CardSettings";
import { CookieConsentProvider } from "@/components/legal/CookieConsent";
import { getShopContacts, getNavCategoryTree, getMenu, getProductBadges, getCardDisplay, getProductOptions, getMetrikaSettings, getSiteMaintenance } from "@/lib/content";
import { getAdminUser } from "@/lib/admin/auth";
import { getCodeSnippets } from "@/lib/integrations/snippets";
import { ConversionClicks } from "@/components/analytics/ConversionClicks";
import Image from "next/image";
import Link from "next/link";

/**
 * Публичный сайт: шапка, подвал и клиентские провайдеры.
 * Контакты, категории и меню (верхнее/футер) тянутся из БД с фолбэком.
 * URL-адреса не меняются — `(site)` это route group.
 */
export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [contacts, navTree, topMenu, mainMenu, footerMenu, badges, cardDisplay, cardOptions, metrika, maintenance, codeSnippets] = await Promise.all([
    getShopContacts(),
    getNavCategoryTree(),
    getMenu("top"),
    getMenu("main"),
    getMenu("footer"),
    getProductBadges(),
    getCardDisplay(),
    getProductOptions(),
    getMetrikaSettings(),
    getSiteMaintenance(),
    getCodeSnippets(),
  ]);

  // Режим технических работ: посетители видят заглушку, а вошедший администратор —
  // обычный сайт с красной плашкой сверху (чтобы проверять витрину во время работ).
  const isAdmin = maintenance.on ? !!(await getAdminUser()) : false;

  // LocalBusiness (Organization) JSON-LD из реальных настроек магазина. @id =
  // …/#organization (на него ссылается publisher в схеме блога).
  const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
  const c = (contacts ?? {}) as Record<string, unknown>;
  const phoneDigits = typeof c.phone === "string" ? `+${(c.phone as string).replace(/\D/g, "")}` : undefined;
  const lat = Number(c.lat) || 50.595414;
  const lng = Number(c.lng) || 36.594843;
  const sameAs = Array.isArray(c.contacts)
    ? (c.contacts as { href?: string }[])
        .map((x) => x.href || "")
        .filter((h) => /vk\.com|t\.me|telegram|wa\.me|whatsapp|ok\.ru|instagram|youtube|dzen|yandex\.ru\/maps|yandex\.ru\/profile|2gis\.(ru|com)|go\.2gis|maps\.apple|maps\.app\.goo|google\.[a-z.]+\/maps|g\.page|zoon\.ru|flamp\.ru/i.test(h))
    : ["https://vk.com/phonetradebel", "https://t.me/phonetradebel", "https://wa.me/79040988877"];
  const orgLd = {
    "@context": "https://schema.org",
    "@type": ["Store", "ElectronicsStore"],
    "@id": `${SITE_URL}/#organization`,
    name: (c.name as string) || "PhoneTrade",
    legalName: (c.legal_entity as string) || undefined,
    description: "Магазин техники Apple в Белгороде: iPhone, iPad, Mac, Apple Watch, AirPods. Trade-in, Б/У, гарантия и сервис.",
    url: SITE_URL,
    image: `${SITE_URL}/brand/logo-mark-black.png`,
    logo: `${SITE_URL}/brand/logo-mark-black.png`,
    telephone: phoneDigits,
    email: (c.email as string) || undefined,
    priceRange: "₽₽",
    currenciesAccepted: "RUB",
    paymentAccepted: "Наличные, Карта, СБП, Рассрочка, Кредит",
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Попова, 36",
      addressLocality: "Белгород",
      addressRegion: "Белгородская область",
      postalCode: "308000",
      addressCountry: "RU",
    },
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    areaServed: [
      { "@type": "City", name: "Белгород" },
      { "@type": "AdministrativeArea", name: "Белгородская область" },
      ...["Старый Оскол", "Губкин", "Шебекино", "Алексеевка", "Валуйки", "Новый Оскол"].map((n) => ({ "@type": "City", name: n })),
    ],
    knowsAbout: ["Apple", "iPhone", "iPad", "MacBook", "Mac", "Apple Watch", "AirPods", "Samsung Galaxy", "Dyson", "техника Apple", "ремонт iPhone", "Trade-in", "Б/У iPhone"],
    openingHoursSpecification: [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "10:00",
      closes: "20:00",
    }],
    sameAs: sameAs.length ? [...new Set(sameAs)] : undefined,
  };
  if (maintenance.on && !isAdmin) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
        <Image src="/brand/logo-mark-black.png" alt="PhoneTrade" width={56} height={56} className="size-14 object-contain opacity-90" />
        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink md:text-3xl">Идут технические работы</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-muted">{maintenance.message}</p>
        {contacts?.phone ? (
          <a href={`tel:+${contacts.phone.replace(/\D/g, "")}`} className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-medium text-white transition-colors hover:bg-ink/85">
            Позвонить: {contacts.phone}
          </a>
        ) : null}
      </main>
    );
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <CartProvider>
          <FavoritesProvider>
            <BadgeRegistryProvider badges={badges}>
            <CardSettingsProvider display={cardDisplay} options={cardOptions}>
              <CookieConsentProvider metrikaId={metrika.id} metrikaForce={metrika.collectWithoutConsent} codeSnippets={codeSnippets}>
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
                <div className="flex min-h-dvh flex-col">
                  {maintenance.on && isAdmin ? (
                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-sale px-4 py-2 text-center text-[13px] font-medium text-white">
                      <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
                      Сайт в режиме технических работ — для посетителей он сейчас закрыт. Вы видите его как администратор.
                      <Link href="/admin/settings/shop" className="underline underline-offset-2 hover:opacity-80">Выключить режим</Link>
                    </div>
                  ) : null}
                  <Header contacts={contacts} categoryTree={navTree} topLinks={topMenu} mainMenu={mainMenu} />
                  <main className="flex-1">{children}</main>
                  <Footer contacts={contacts} legalLinks={footerMenu} />
                </div>
                <PageViewTracker />
                <ConversionClicks />
                <BackToTop />
              </CookieConsentProvider>
            </CardSettingsProvider>
            </BadgeRegistryProvider>
          </FavoritesProvider>
        </CartProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
