"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { useAuth } from "@/components/providers/AuthProvider";

export function AccountClientLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (ready && !user) {
      router.replace("/auth/login?returnTo=/account");
    }
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <section className="bg-surface min-h-[60vh]">
        <div className="container-page py-16 text-center text-sm text-ink-muted">
          Загрузка…
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface min-h-[60vh]">
      <div className="container-page pt-8 md:pt-10 pb-16 md:pb-24">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] text-ink mb-8">
          Личный кабинет
        </h1>
        <div className="grid gap-5 lg:gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-[88px] lg:self-start">
            <AccountSidebar />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">{children}</div>
        </div>
      </div>
    </section>
  );
}
