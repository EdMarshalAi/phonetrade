import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteBlogCategory } from "./actions";

export const metadata: Metadata = { title: "Категории блога" };

interface CategoryRow {
  id: string;
  title: string;
  slug: string;
  color: string | null;
  sort_order: number;
}

export default async function BlogCategoriesPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("blog_categories")
    .select("id,title,slug,color,sort_order")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  const rows = (data ?? []) as CategoryRow[];

  return (
    <>
      <PageHeader
        title="Категории блога"
        description="Теги и рубрики для группировки постов."
        actions={
          <Link href="/admin/content/blog/categories/new">
            <AdminButton>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
            </AdminButton>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Категорий пока нет"
          hint="Создайте рубрики для сортировки постов."
          action={
            <Link href="/admin/content/blog/categories/new">
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
            <TH className="w-24">Цвет</TH>
            <TH className="w-24">Порядок</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.title}</TD>
                <TD className="text-ink-muted">{c.slug}</TD>
                <TD>
                  {c.color ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-sm border border-border/60"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-[13px] text-ink-muted">{c.color}</span>
                    </div>
                  ) : (
                    <span className="text-ink-subtle">—</span>
                  )}
                </TD>
                <TD className="text-ink-muted">{c.sort_order}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/content/blog/categories/${c.id}/edit`}>
                      <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                    </Link>
                    <DeleteButton action={deleteBlogCategory.bind(null, c.id)} itemName={c.title} iconOnly />
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
