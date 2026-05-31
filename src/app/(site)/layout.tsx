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
import { getShopContacts, getNavCategoryTree, getMenu, getProductBadges, getCardDisplay, getProductOptions, getMetrikaId } from "@/lib/content";

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
  const [contacts, navTree, topMenu, footerMenu, badges, cardDisplay, cardOptions, metrikaId] = await Promise.all([
    getShopContacts(),
    getNavCategoryTree(),
    getMenu("top"),
    getMenu("footer"),
    getProductBadges(),
    getCardDisplay(),
    getProductOptions(),
    getMetrikaId(),
  ]);
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
