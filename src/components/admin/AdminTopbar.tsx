"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { PanelLeft, ChevronRight, ChevronDown, LogOut, ExternalLink } from "lucide-react";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { signOutAction } from "@/lib/admin/session-actions";
import { cn } from "@/lib/utils/cn";

interface Crumb {
  label: string;
  href?: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  manager: "Менеджер",
  content: "Контент-менеджер",
  analytics: "Аналитик",
};

/** Под-маршруты объединённых разделов → крошки родительского раздела. */
const CRUMB_OVERRIDES: { prefix: string; group: string; label: string; href: string }[] = [
  { prefix: "/admin/content/bento", group: "Контент", label: "Блоки на главной", href: "/admin/content/home-blocks" },
  { prefix: "/admin/content/advantages", group: "Контент", label: "Блоки на главной", href: "/admin/content/home-blocks" },
  { prefix: "/admin/content/trade-in-block", group: "Контент", label: "Блоки на главной", href: "/admin/content/home-blocks" },
  { prefix: "/admin/settings/users/audit-log", group: "Настройки", label: "Пользователи", href: "/admin/settings/users" },
];

function tailLabel(pathname: string, base: string): string {
  const tail = pathname.slice(base.length).split("/").filter(Boolean);
  const last = tail[tail.length - 1] ?? "";
  if (last === "new") return "Создание";
  if (last === "edit" || tail.includes("edit")) return "Редактирование";
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function buildCrumbs(pathname: string): Crumb[] {
  const root: Crumb = { label: "Админка", href: "/admin" };
  if (pathname === "/admin") return [{ label: "Обзор" }];

  // Ручные оверрайды для объединённых разделов.
  const ov = CRUMB_OVERRIDES.find((o) => pathname === o.prefix || pathname.startsWith(o.prefix + "/"));
  if (ov) {
    const crumbs: Crumb[] = [root, { label: ov.group }];
    if (pathname === ov.href) crumbs.push({ label: ov.label });
    else {
      crumbs.push({ label: ov.label, href: ov.href });
      crumbs.push({ label: tailLabel(pathname, ov.prefix) });
    }
    return crumbs;
  }

  let best: { groupLabel?: string; label: string; href: string } | null = null;
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (item.href === "/admin") continue;
      if (
        (pathname === item.href || pathname.startsWith(item.href + "/")) &&
        (!best || item.href.length > best.href.length)
      ) {
        best = { groupLabel: group.label, label: item.label, href: item.href };
      }
    }
  }

  if (!best) {
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return [root, { label: last.charAt(0).toUpperCase() + last.slice(1) }];
  }

  const crumbs: Crumb[] = [root];
  if (best.groupLabel) crumbs.push({ label: best.groupLabel });
  if (pathname === best.href) {
    crumbs.push({ label: best.label });
  } else {
    crumbs.push({ label: best.label, href: best.href });
    crumbs.push({ label: tailLabel(pathname, best.href) });
  }
  return crumbs;
}

export function AdminTopbar({
  userName,
  userEmail,
  role,
  onMenuClick,
}: {
  userName: string;
  userEmail: string;
  role: string;
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border/70 bg-white/85 px-4 backdrop-blur-md lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-sm p-1.5 text-ink-muted hover:bg-surface hover:text-ink lg:hidden"
          aria-label="Открыть меню"
        >
          <PanelLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <nav aria-label="Хлебные крошки" className="flex min-w-0 items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={i} className="flex min-w-0 items-center gap-1.5">
                {i > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" strokeWidth={2} /> : null}
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="shrink-0 text-ink-muted hover:text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={last ? "truncate font-medium text-ink" : "shrink-0 text-ink-muted"}>{crumb.label}</span>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Меню пользователя */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-sm border border-border bg-white py-1.5 pl-3 pr-2 transition-colors hover:bg-surface"
        >
          <span className="hidden text-right leading-tight sm:block">
            <span className="block text-[13px] font-medium text-ink">{userName || userEmail}</span>
            <span className="block text-[11px] text-ink-subtle">{ROLE_LABEL[role] ?? role}</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 text-ink-subtle transition-transform", menuOpen && "rotate-180")} strokeWidth={2} />
        </button>

        {menuOpen ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-md border border-border/70 bg-white py-1 shadow-lg">
              <div className="border-b border-border/60 px-3 py-2 sm:hidden">
                <p className="text-[13px] font-medium text-ink">{userName || userEmail}</p>
                <p className="text-[11px] text-ink-subtle">{ROLE_LABEL[role] ?? role}</p>
              </div>
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] text-ink hover:bg-surface"
              >
                <ExternalLink className="h-4 w-4 text-ink-subtle" strokeWidth={1.75} /> На сайт
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13.5px] text-sale hover:bg-sale/5"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} /> Выйти
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
