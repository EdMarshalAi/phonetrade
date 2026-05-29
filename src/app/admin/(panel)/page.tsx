import type { Metadata } from "next";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  FolderTree,
  Inbox,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader, Panel, PanelHeader, PanelTitle } from "@/components/admin/ui";
import { navForAccess } from "@/lib/admin/nav";
import { TimeSeriesChart, type SeriesPoint } from "@/components/admin/Charts";

export const metadata: Metadata = { title: "Обзор" };

/** Безопасный count: возвращает null, если таблицы ещё нет (миграции не применены). */
async function safeCount(table: string): Promise<number | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  const [products, orders, categories, leads] = await Promise.all([
    safeCount("products"),
    safeCount("orders"),
    safeCount("categories"),
    safeCount("leads"),
  ]);

  // Выручка по дням за 30 дней (из заказов; пусто — нет данных).
  let salesSeries: SeriesPoint[] = [];
  try {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("orders")
      .select("total,created_at")
      .is("deleted_at", null)
      .gte("created_at", since.toISOString());
    const byDay: Record<string, number> = {};
    for (const o of (data ?? []) as { total: number; created_at: string }[]) {
      const d = o.created_at.slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + (o.total ?? 0);
    }
    const days: string[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    salesSeries = days.map((d) => ({ label: d.slice(5).replace("-", "."), value: byDay[d] ?? 0 }));
  } catch {
    salesSeries = [];
  }
  const hasSales = salesSeries.some((p) => p.value > 0);

  const kpis = [
    { label: "Товаров", value: products, icon: Package, href: "/admin/catalog/products" },
    { label: "Заказов", value: orders, icon: ShoppingCart, href: "/admin/orders" },
    { label: "Категорий", value: categories, icon: FolderTree, href: "/admin/catalog/categories" },
    { label: "Заявок", value: leads, icon: Inbox, href: "/admin/leads" },
  ];

  const groups = navForAccess(admin.fullAccess, admin.permissions).filter((g) => g.label);

  return (
    <>
      <PageHeader
        title={`Добро пожаловать, ${admin.fullName || "коллега"}`}
        description="Сводка магазина. Графики и аналитика подключаются в Фазе 7 — пока показаны базовые счётчики."
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className="group rounded-md border border-border/70 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:border-border-strong"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-muted">{k.label}</span>
                <Icon className="h-4 w-4 text-ink-subtle" strokeWidth={1.75} />
              </div>
              <p className="mt-2 text-[26px] font-semibold tracking-tight text-ink">
                {k.value === null ? "—" : k.value.toLocaleString("ru-RU")}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Динамика продаж за 30 дней */}
      <Panel>
        <PanelHeader>
          <PanelTitle>Выручка за 30 дней</PanelTitle>
          <span className="text-[12px] text-ink-subtle">из заказов</span>
        </PanelHeader>
        <div className="p-4">
          {hasSales ? (
            <TimeSeriesChart data={salesSeries} format="thousands" />
          ) : (
            <div className="flex h-44 items-center justify-center gap-2 text-ink-subtle">
              <BarChart3 className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-sm">Выручка появится после первых заказов</span>
            </div>
          )}
        </div>
      </Panel>

      {/* Быстрый доступ к разделам */}
      <div>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
          Разделы
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Panel key={group.label} className="p-4">
              <p className="mb-2 text-[13px] font-semibold text-ink">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="group flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13.5px] text-ink-muted transition-colors hover:bg-surface hover:text-ink"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
                        <span className="flex-1 truncate">{item.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-ink-subtle opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" strokeWidth={2} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>
      </div>
    </>
  );
}
