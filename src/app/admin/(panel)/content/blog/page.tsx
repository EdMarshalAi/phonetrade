import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, ImageOff } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { FilterSelect, Pagination } from "@/components/admin/ListControls";
import { deleteBlogPost } from "./actions";

export const metadata: Metadata = { title: "Блог" };

const PAGE_SIZE = 20;
const STATUS_LABEL: Record<string, string> = {
  draft: "Черновик",
  published: "Опубликован",
  archived: "Архив",
};

interface PostRow {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  category_id: string | null;
  status: string;
  created_at: string;
}

interface CategoryRow {
  id: string;
  title: string;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createSupabaseAdminClient();

  let query = db
    .from("blog_posts")
    .select("id,title,slug,cover_url,category_id,status,created_at", { count: "exact" });

  if (sp.status) query = query.eq("status", sp.status);

  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);

  const { data: cats } = await db
    .from("blog_categories")
    .select("id,title")
    .order("sort_order", { ascending: true });
  const categories = (cats ?? []) as CategoryRow[];

  const rows = (data ?? []) as PostRow[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!sp.status;

  return (
    <>
      <PageHeader
        title="Блог"
        description={`Всего: ${total}. Посты, категории, rich-редактор.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/content/blog/categories">
              <AdminButton variant="outline">Категории</AdminButton>
            </Link>
            <Link href="/admin/content/blog/new">
              <AdminButton>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить пост
              </AdminButton>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          param="status"
          allLabel="Все статусы"
          options={[
            { value: "published", label: "Опубликован" },
            { value: "draft", label: "Черновик" },
            { value: "archived", label: "Архив" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Ничего не найдено" : "Постов пока нет"}
          hint={hasFilters ? "Измените фильтры." : "Создайте первый пост блога."}
          action={
            !hasFilters ? (
              <Link href="/admin/content/blog/new">
                <AdminButton>
                  <Plus className="h-4 w-4" strokeWidth={2} /> Создать пост
                </AdminButton>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TH className="w-16">Обложка</TH>
              <TH>Заголовок</TH>
              <TH className="w-36">Категория</TH>
              <TH className="w-28">Статус</TH>
              <TH className="w-32">Дата</TH>
              <TH className="w-px text-right">Действия</TH>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="flex h-10 w-14 items-center justify-center overflow-hidden rounded-sm border border-border/60 bg-surface">
                      {p.cover_url ? (
                        <Image
                          src={p.cover_url}
                          alt={p.title}
                          width={56}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="h-4 w-4 text-ink-subtle" strokeWidth={1.5} />
                      )}
                    </div>
                  </TD>
                  <TD>
                    <Link
                      href={`/admin/content/blog/${p.id}/edit`}
                      className="font-medium text-ink hover:underline"
                    >
                      {p.title}
                    </Link>
                  </TD>
                  <TD className="text-ink-muted">
                    {categories.find((c) => c.id === p.category_id)?.title ?? (p.category_id ? p.category_id : "—")}
                  </TD>
                  <TD>
                    <StatusBadge
                      tone={
                        p.status === "published"
                          ? "strong"
                          : p.status === "archived"
                          ? "danger"
                          : "neutral"
                      }
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </StatusBadge>
                  </TD>
                  <TD className="text-ink-muted">
                    {new Date(p.created_at).toLocaleDateString("ru-RU")}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/content/blog/${p.id}/edit`}>
                        <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                      </Link>
                      <DeleteButton action={deleteBlogPost.bind(null, p.id)} itemName={p.title} iconOnly />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination page={page} pages={pages} />
        </>
      )}
    </>
  );
}
