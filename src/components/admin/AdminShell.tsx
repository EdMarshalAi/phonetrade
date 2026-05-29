"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import type { AdminRole } from "@/lib/admin/auth";

/**
 * Клиентский каркас админки: тёмный сайдбар + topbar + контентная область.
 * Держит состояние мобильного drawer. Данные пользователя приходят из
 * серверного layout (только сериализуемые значения, без компонентов).
 */
export function AdminShell({
  role,
  userName,
  userEmail,
  children,
}: {
  role: AdminRole;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-surface text-ink">
      <AdminSidebar role={role} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          role={role}
          userName={userName}
          userEmail={userEmail}
          onMenuClick={() => setOpen(true)}
        />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1200px] space-y-6">{children}</div>
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
