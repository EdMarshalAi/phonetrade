"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/account", label: "Профиль", icon: UserIcon },
  { href: "/account/orders", label: "Мои заказы", icon: Package },
  { href: "/account/favorites", label: "Избранное", icon: Heart },
  { href: "/account/privacy", label: "Конфиденциальность", icon: ShieldCheck },
];

const SOON: { label: string; icon: typeof MapPin }[] = [];

export function AccountSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <nav className="rounded-3xl bg-white border border-border/60 p-3 lg:sticky lg:top-[88px]">
      <div className="flex items-center gap-3 p-3 mb-2">
        <span
          aria-hidden
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white text-sm font-semibold"
        >
          {(user?.name?.trim()?.[0] ?? "Я").toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">
            {user?.name || "Гость"}
          </p>
          <p className="text-[12px] text-ink-muted truncate">{user?.phone}</p>
        </div>
      </div>

      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/account" && pathname.startsWith(item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40",
                  active
                    ? "bg-surface text-ink"
                    : "text-ink-muted hover:text-ink hover:bg-surface/70"
                )}
              >
                <item.icon className="size-[18px]" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        {SOON.map((item) => (
          <li key={item.label}>
            <span className="flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium text-ink-subtle cursor-not-allowed">
              <item.icon className="size-[18px]" aria-hidden />
              {item.label}
              <span className="ml-auto text-[10px] uppercase tracking-wider rounded-full bg-surface px-2 py-0.5">
                скоро
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 h-11 px-3 rounded-xl text-sm font-medium text-ink-muted hover:text-sale hover:bg-surface/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          <LogOut className="size-[18px]" aria-hidden />
          Выйти
        </button>
      </div>
    </nav>
  );
}
