import { TooltipProvider } from "@/components/providers/TooltipProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { getShopContacts } from "@/lib/content";

/**
 * Публичный сайт: шапка, подвал и клиентские провайдеры (тултипы, авторизация).
 * Контакты шапки/футера тянутся из настроек магазина (shop_settings) с
 * фолбэком на дефолт. URL-адреса не меняются — `(site)` это route group.
 */
export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const contacts = await getShopContacts();
  return (
    <AuthProvider>
      <TooltipProvider>
        <div className="flex min-h-dvh flex-col">
          <Header contacts={contacts} />
          <main className="flex-1">{children}</main>
          <Footer contacts={contacts} />
        </div>
        <PageViewTracker />
      </TooltipProvider>
    </AuthProvider>
  );
}
