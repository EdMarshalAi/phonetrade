import { TooltipProvider } from "@/components/providers/TooltipProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { getShopContacts } from "@/lib/content";
import { getCategories } from "@/lib/products";

/**
 * Публичный сайт: шапка, подвал и клиентские провайдеры (тултипы, авторизация).
 * Контакты и категории шапки/футера тянутся из БД (shop_settings/categories)
 * с фолбэком. URL-адреса не меняются — `(site)` это route group.
 */
export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [contacts, categories] = await Promise.all([getShopContacts(), getCategories()]);
  const catItems = categories
    .filter((c) => c.slug !== "trade-in")
    .map((c) => ({ slug: c.slug, title: c.title }));
  return (
    <AuthProvider>
      <TooltipProvider>
        <div className="flex min-h-dvh flex-col">
          <Header contacts={contacts} categories={catItems} />
          <main className="flex-1">{children}</main>
          <Footer contacts={contacts} />
        </div>
        <PageViewTracker />
      </TooltipProvider>
    </AuthProvider>
  );
}
