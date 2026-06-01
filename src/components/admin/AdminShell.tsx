"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Toaster } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { cn } from "@/lib/utils/cn";
import type { AdminRole } from "@/lib/admin/auth";

// Страницы с плотными таблицами — на всю ширину контент-области (без max-w).
const FULL_WIDTH_PATHS = ["/admin/catalog/pricing"];

/**
 * Клиентский каркас админки: тёмный сайдбар + topbar + контентная область.
 * Держит состояние мобильного drawer. Данные пользователя приходят из
 * серверного layout (только сериализуемые значения, без компонентов).
 */
export function AdminShell({
  role,
  fullAccess,
  permissions,
  userName,
  userEmail,
  children,
}: {
  role: AdminRole;
  fullAccess: boolean;
  permissions: string[];
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const fullWidth = FULL_WIDTH_PATHS.some((p) => pathname?.startsWith(p));

  return (
    <div className="flex min-h-dvh bg-surface text-ink">
      <AdminSidebar fullAccess={fullAccess} permissions={permissions} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          role={role}
          userName={userName}
          userEmail={userEmail}
          onMenuClick={() => setOpen(true)}
        />
        <main className="relative flex-1 overflow-hidden px-4 py-6 lg:px-8 lg:py-8">
          <Image
            src="/brand/logo-mark-white.png"
            alt=""
            aria-hidden
            width={200}
            height={200}
            className="pointer-events-none absolute bottom-4 right-4 z-0 w-[160px] select-none opacity-10 lg:w-[200px]"
          />
          <div className={cn("relative z-10 mx-auto w-full space-y-6", fullWidth ? "max-w-none" : "max-w-[1200px]")}>{children}</div>
        </main>
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "10px",
            border: "1px solid var(--color-border)",
            fontSize: "14px",
          },
        }}
      />
    </div>
  );
}
