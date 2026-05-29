import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, Panel, PanelHeader, PanelTitle, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
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

const LOCATION_LABELS: Record<string, string> = {
  top: "Верхнее меню",
  main: "Основное меню",
  footer: "Футер",
};

const LOCATIONS = ["top", "main", "footer"] as const;

export default async function NavigationPage() {
  await requireAdmin(["admin"]);
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("menu_items")
    .select("id, menu_location, title, link_url, sort_order, is_visible")
    .order("sort_order", { ascending: true });
  const items = (data ?? []) as MenuItem[];
  const byLocation = Object.fromEntries(
    LOCATIONS.map((loc) => [loc, items.filter((i) => i.menu_location === loc)])
  );

  return (
    <>
      <PageHeader
        title="Навигация"
        description="Верхнее, основное и футер-меню. Изменения применяются на сайте немедленно."
        actions={
          <Link href="/admin/settings/navigation/new">
            <AdminButton>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить пункт
            </AdminButton>
          </Link>
        }
      />

      <div className="space-y-6">
        {LOCATIONS.map((loc) => {
          const rows = byLocation[loc];
          return (
            <Panel key={loc}>
              <PanelHeader>
                <PanelTitle>{LOCATION_LABELS[loc]}</PanelTitle>
                <Link href={`/admin/settings/navigation/new?location=${loc}`}>
                  <AdminButton variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Добавить
                  </AdminButton>
                </Link>
              </PanelHeader>

              {rows.length === 0 ? (
                <div className="px-5 py-8 text-center text-[14px] text-ink-muted">
                  Пунктов пока нет
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
          );
        })}
      </div>

      {items.length === 0 && (
        <EmptyState
          title="Меню пока пустое"
          hint="Добавьте первый пункт навигации"
          action={
            <Link href="/admin/settings/navigation/new">
              <AdminButton>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить пункт
              </AdminButton>
            </Link>
          }
        />
      )}
    </>
  );
}
