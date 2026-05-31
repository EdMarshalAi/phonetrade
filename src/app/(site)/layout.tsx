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
import { getShopContacts, getNavCategoryTree, getMenu, getProductBadges, getCardDisplay, getProductOptions, getMetrikaId, getSiteMaintenance } from "@/lib/content";
import Image from "next/image";

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
  const [contacts, navTree, topMenu, footerMenu, badges, cardDisplay, cardOptions, metrikaId, maintenance] = await Promise.all([
    getShopContacts(),
    getNavCategoryTree(),
    getMenu("top"),
    getMenu("footer"),
    getProductBadges(),
    getCardDisplay(),
    getProductOptions(),
    getMetrikaId(),
    getSiteMaintenance(),
  ]);

  // Режим технических работ — закрываем витрину для посетителей (админка работает отдельно).
  if (maintenance.on) {
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
              <CookieConsentProvider metrikaId={metrikaId}>
                <div className="flex min-h-dvh flex-col">
                  <Header contacts={contacts} categoryTree={navTree} topLinks={topMenu} />
                  <main className="flex-1">{children}</main>
                  <Footer contacts={contacts} legalLinks={footerMenu} />
                </div>
                <PageViewTracker />
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
