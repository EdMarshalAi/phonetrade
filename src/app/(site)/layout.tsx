import { TooltipProvider } from "@/components/providers/TooltipProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { BadgeRegistryProvider } from "@/components/product/ProductBadges";
import { getShopContacts, getNavCategories, getMenu, getProductBadges } from "@/lib/content";

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
  const [contacts, navCategories, topMenu, footerMenu, badges] = await Promise.all([
    getShopContacts(),
    getNavCategories(),
    getMenu("top"),
    getMenu("footer"),
    getProductBadges(),
  ]);
  return (
    <AuthProvider>
      <TooltipProvider>
        <BadgeRegistryProvider badges={badges}>
          <div className="flex min-h-dvh flex-col">
            <Header contacts={contacts} categories={navCategories} topLinks={topMenu} />
            <main className="flex-1">{children}</main>
            <Footer contacts={contacts} legalLinks={footerMenu} />
          </div>
          <PageViewTracker />
        </BadgeRegistryProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
