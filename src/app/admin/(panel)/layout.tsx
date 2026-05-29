import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: { default: "Админка", template: "%s · Админка PhoneTrade" },
  robots: { index: false, follow: false },
};

/**
 * Защищённый layout панели. `(panel)` — route group, не влияет на URL:
 * страницы внутри отдаются по /admin/*. Гард: requireAdmin() редиректит
 * на /admin/login, если нет активной записи в admin_users. /admin/login
 * живёт вне этой группы и шелла не получает.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return (
    <AdminShell
      role={admin.role}
      fullAccess={admin.fullAccess}
      permissions={admin.permissions}
      userName={admin.fullName}
      userEmail={admin.email}
    >
      {children}
    </AdminShell>
  );
}
