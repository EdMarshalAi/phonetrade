import { TooltipProvider } from "@/components/providers/TooltipProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

/**
 * Публичный сайт: шапка, подвал и клиентские провайдеры (моковая авторизация,
 * тултипы). URL-адреса не меняются — `(site)` это route group.
 */
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <PageViewTracker />
      </TooltipProvider>
    </AuthProvider>
  );
}
