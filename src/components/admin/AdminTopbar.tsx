"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { PanelLeft, ChevronRight, LogOut, ExternalLink } from "lucide-react";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { signOutAction } from "@/lib/admin/session-actions";

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

/** Хлебные крошки по текущему пути через структуру навигации. */
function buildCrumbs(pathname: string): Crumb[] {
  const root: Crumb = { label: "Админка", href: "/admin" };
  if (pathname === "/admin") return [{ label: "Обзор" }];

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

  const isExact = pathname === best.href;
  if (isExact) {
    // Текущий раздел — последняя крошка (без ссылки).
    crumbs.push({ label: best.label });
  } else {
    // Мы на под-странице (new/edit/…): раздел кликабельный, плюс финальная крошка.
    crumbs.push({ label: best.label, href: best.href });
    const tail = pathname.slice(best.href.length).split("/").filter(Boolean);
    const lastSeg = tail[tail.length - 1] ?? "";
    const tailLabel =
      lastSeg === "new"
        ? "Создание"
        : lastSeg === "edit" || tail.includes("edit")
          ? "Редактирование"
          : lastSeg.charAt(0).toUpperCase() + lastSeg.slice(1);
    crumbs.push({ label: tailLabel });
  }
  return crumbs;
}

function initials(name: string, email: string): string {
  const src = name.trim() || email;
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0]?.toUpperCase() ?? "");
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
                {i > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" strokeWidth={2} />
                ) : null}
                {crumb.href && !last ? (
                  <Link href={crumb.href} className="shrink-0 text-ink-muted hover:text-ink">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={last ? "truncate font-medium text-ink" : "shrink-0 text-ink-muted"}>
                    {crumb.label}
                  </span>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-white px-2.5 text-[13px] text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          title="Открыть сайт в новой вкладке"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">На сайт</span>
        </Link>
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-[13px] font-medium text-ink">{userName || userEmail}</p>
          <p className="text-[11px] text-ink-subtle">{ROLE_LABEL[role] ?? role}</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">
          {initials(userName, userEmail)}
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            aria-label="Выйти"
            title="Выйти"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </header>
  );
}
