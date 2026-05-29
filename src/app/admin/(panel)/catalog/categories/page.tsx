import type { Metadata } from "next";
import Link from "next/link";
import { Plus, CornerDownRight } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteCategory } from "./actions";

export const metadata: Metadata = { title: "Категории" };

interface CatRow {
  slug: string;
  title: string;
  parent_slug: string | null;
  sort: number;
  is_published: boolean | null;
}

/** Сортировка деревом: корневые по sort, под ними дочерние. */
function asTree(rows: CatRow[]): { row: CatRow; depth: number }[] {
  const roots = rows.filter((r) => !r.parent_slug).sort((a, b) => a.sort - b.sort);
  const out: { row: CatRow; depth: number }[] = [];
  for (const root of roots) {
    out.push({ row: root, depth: 0 });
    rows
      .filter((r) => r.parent_slug === root.slug)
      .sort((a, b) => a.sort - b.sort)
      .forEach((child) => out.push({ row: child, depth: 1 }));
  }
  // осиротевшие (родитель не найден среди корней) — в конец
  const placed = new Set(out.map((o) => o.row.slug));
  rows.filter((r) => !placed.has(r.slug)).forEach((r) => out.push({ row: r, depth: 0 }));
  return out;
}

export default async function CategoriesPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("categories").select("slug,title,parent_slug,sort,is_published");
  const tree = asTree((data ?? []) as CatRow[]);

  return (
    <>
      <PageHeader
        title="Категории"
        description="Дерево категорий. Формируют меню, bento на главной и фильтрацию в каталоге."
        actions={
          <Link href="/admin/catalog/categories/new">
            <AdminButton>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
            </AdminButton>
          </Link>
        }
      />

      {tree.length === 0 ? (
        <EmptyState
          title="Категорий пока нет"
          action={
            <Link href="/admin/catalog/categories/new">
              <AdminButton>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить категорию
              </AdminButton>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TH>Название</TH>
            <TH>Slug</TH>
            <TH className="w-20">Порядок</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {tree.map(({ row, depth }) => (
              <TR key={row.slug}>
                <TD className="font-medium">
                  <span className="flex items-center gap-1.5" style={{ paddingLeft: depth * 18 }}>
                    {depth > 0 ? <CornerDownRight className="h-3.5 w-3.5 text-ink-subtle" strokeWidth={2} /> : null}
                    {row.title}
                  </span>
                </TD>
                <TD className="text-ink-muted">{row.slug}</TD>
                <TD className="text-ink-muted">{row.sort}</TD>
                <TD>
                  {row.is_published === false ? (
                    <StatusBadge>Скрыта</StatusBadge>
                  ) : (
                    <StatusBadge tone="strong">Опубликована</StatusBadge>
                  )}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/catalog/categories/${row.slug}/edit`}>
                      <AdminButton variant="outline" size="sm">
                        Изменить
                      </AdminButton>
                    </Link>
                    <DeleteButton action={deleteCategory.bind(null, row.slug)} itemName={row.title} iconOnly />
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
