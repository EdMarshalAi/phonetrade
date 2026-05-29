import { TooltipProvider } from "@/components/providers/TooltipProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { getShopContacts, getNavCategories, getMenu } from "@/lib/content";

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
  const [contacts, navCategories, topMenu, footerMenu] = await Promise.all([
    getShopContacts(),
    getNavCategories(),
    getMenu("top"),
    getMenu("footer"),
  ]);
  return (
    <AuthProvider>
      <TooltipProvider>
        <div className="flex min-h-dvh flex-col">
          <Header contacts={contacts} categories={navCategories} topLinks={topMenu} />
          <main className="flex-1">{children}</main>
          <Footer contacts={contacts} legalLinks={footerMenu} />
        </div>
        <PageViewTracker />
      </TooltipProvider>
    </AuthProvider>
  );
}
