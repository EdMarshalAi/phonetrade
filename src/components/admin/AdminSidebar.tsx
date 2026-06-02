"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { navForAccess } from "@/lib/admin/nav";

const COLLAPSE_KEY = "admin-nav-collapsed";
/** Группы, свёрнутые по умолчанию (однократно; дальше — выбор пользователя). */
const DEFAULT_COLLAPSED = ["Рассылки"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Тёмный сайдбар админки (bg-ink #1d1d1f). Группы с трекинг-заголовками,
 * пункты с lucide-иконками, активное состояние — заливка white/10 + левый
 * акцент. На мобильных работает как drawer (управляется AdminShell).
 */
export function AdminSidebar({
  fullAccess,
  permissions,
  open,
  onClose,
}: {
  fullAccess: boolean;
  permissions: string[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const groups = navForAccess(fullAccess, permissions);

  // Свёрнутые группы (по label) — сохраняются в localStorage.
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      const stored = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      const appliedRaw = localStorage.getItem(COLLAPSE_KEY + "-defaults");
      const applied = new Set<string>(appliedRaw ? (JSON.parse(appliedRaw) as string[]) : []);
      let changed = false;
      for (const d of DEFAULT_COLLAPSED) {
        if (!applied.has(d)) { stored.add(d); applied.add(d); changed = true; }
      }
      if (changed) {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...stored]));
        localStorage.setItem(COLLAPSE_KEY + "-defaults", JSON.stringify([...applied]));
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- гидрация из localStorage (недоступен при SSR)
      setCollapsed(stored);
    } catch { /* ignore */ }
  }, []);
  const toggleGroup = (label: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <>
      {/* затемнение под drawer на мобильных */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-ink text-onDark",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* бренд */}
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" className="flex items-center gap-3 leading-none" onClick={onClose}>
            <Image
              src="/brand/logo-mark-white.png"
              alt=""
              aria-hidden
              width={32}
              height={32}
              className="size-7 shrink-0 select-none"
            />
            <span className="flex flex-col">
              <span className="text-[17px] font-semibold tracking-tight text-white">
                PhoneTrade
              </span>
              <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-onDark-muted">
                Админка
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1.5 text-onDark-muted hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* навигация */}
        <nav className="scrollbar-hide flex-1 overflow-y-auto px-3 pb-6">
          {groups.map((group, gi) => {
            const label = group.label;
            const hasActive = group.items.some((it) => isActive(pathname, it.href));
            // активную группу не сворачиваем принудительно — показываем её содержимое
            const isCollapsed = !!label && collapsed.has(label) && !hasActive;
            return (
            <div key={label ?? gi} className={cn(gi > 0 && "mt-5")}>
              {label ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(label)}
                  className="group flex w-full items-center justify-between gap-2 px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-onDark-muted/70 transition-colors hover:text-onDark-muted"
                >
                  <span>{label}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", isCollapsed && "-rotate-90")} strokeWidth={2.25} />
                </button>
              ) : null}
              <ul className={cn("space-y-0.5", isCollapsed && "hidden")}>
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-sm px-3 py-2 text-[13.5px] transition-colors duration-200",
                          active
                            ? "bg-white/10 font-medium text-white"
                            : "text-onDark-muted hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-white" />
                        ) : null}
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            active ? "text-white" : "text-onDark-muted group-hover:text-white"
                          )}
                          strokeWidth={1.75}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
