import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AnalyticsTabs } from "@/components/admin/analytics/AnalyticsTabs";
import { deleteMenuItem } from "./actions";

export const metadata: Metadata = { title: "Навигация" };

interface MenuItem {
  id: string;
  menu_location: string;
  title: string;
  link_url: string;
  sort_order: number;
  is_visible: boolean;
}

const TABS = [
  { key: "top", label: "Верхнее меню" },
  { key: "main", label: "Основное меню" },
  { key: "footer", label: "Футер" },
];
const LOCATION_HINT: Record<string, string> = {
  top: "Тонкая строка над шапкой (О компании, Доставка, Контакты…).",
  main: "Основное меню в шапке — категории и ключевые разделы.",
  footer: "Юридические и служебные ссылки в подвале сайта.",
};

export default async function NavigationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin(["admin"]);
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as string) : "top";

  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("menu_items")
    .select("id, menu_location, title, link_url, sort_order, is_visible")
    .eq("menu_location", tab)
    .order("sort_order", { ascending: true });
  const rows = (data ?? []) as MenuItem[];

  return (
    <>
      <PageHeader
        title="Навигация"
        description="Верхнее, основное и футер-меню. Изменения применяются на сайте немедленно."
        actions={
          <Link href={`/admin/settings/navigation/new?location=${tab}`}>
            <AdminButton>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить пункт
            </AdminButton>
          </Link>
        }
      />

      <AnalyticsTabs tabs={TABS} active={tab} />

      <p className="mt-3 mb-4 text-[13px] text-ink-muted">{LOCATION_HINT[tab]}</p>

      <Panel>
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[14px] text-ink-muted">В этом меню пока нет пунктов.</p>
            <Link href={`/admin/settings/navigation/new?location=${tab}`} className="mt-3 inline-block">
              <AdminButton variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Добавить пункт
              </AdminButton>
            </Link>
          </div>
        ) : (
          <Table>
            <THead>
              <TH>Название</TH>
              <TH>URL</TH>
              <TH className="w-20">Порядок</TH>
              <TH className="w-28">Видимость</TH>
              <TH className="w-px text-right">Действия</TH>
            </THead>
            <TBody>
              {rows.map((item) => (
                <TR key={item.id}>
                  <TD className="font-medium">{item.title}</TD>
                  <TD className="text-ink-muted">{item.link_url}</TD>
                  <TD className="text-ink-muted">{item.sort_order}</TD>
                  <TD>
                    {item.is_visible ? (
                      <StatusBadge tone="strong">Виден</StatusBadge>
                    ) : (
                      <StatusBadge>Скрыт</StatusBadge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/settings/navigation/${item.id}/edit`}>
                        <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                      </Link>
                      <DeleteButton
                        action={deleteMenuItem.bind(null, item.id)}
                        itemName={item.title}
                        iconOnly
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
