import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deletePage } from "./actions";

export const metadata: Metadata = { title: "Статические страницы" };

const STATUS_LABEL: Record<string, string> = { draft: "Черновик", published: "Опубликована", archived: "Архив" };

interface Row { slug: string; title: string; status: string; updated_at: string }

export default async function PagesListPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db.from("static_pages").select("slug,title,status,updated_at").order("title");
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader
        title="Статические страницы"
        description="О компании, доставка, гарантия, оферта и др. Slug = путь на сайте (/slug)."
        actions={<Link href="/admin/content/pages/new"><AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> Добавить</AdminButton></Link>}
      />
      {rows.length === 0 ? (
        <EmptyState title="Страниц пока нет" hint="Создайте «О компании», «Доставка», «Гарантия» и т.д."
          action={<Link href="/admin/content/pages/new"><AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> Создать страницу</AdminButton></Link>} />
      ) : (
        <Table>
          <THead>
            <TH>Заголовок</TH>
            <TH>Slug</TH>
            <TH className="w-32">Обновлена</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((p) => (
              <TR key={p.slug}>
                <TD className="font-medium">{p.title}</TD>
                <TD className="text-ink-muted">/{p.slug}</TD>
                <TD className="text-ink-muted">{new Date(p.updated_at).toLocaleDateString("ru-RU")}</TD>
                <TD>{p.status === "published" ? <StatusBadge tone="strong">Опубликована</StatusBadge> : <StatusBadge>{STATUS_LABEL[p.status] ?? p.status}</StatusBadge>}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/content/pages/${p.slug}/edit`}><AdminButton variant="outline" size="sm">Изменить</AdminButton></Link>
                    <DeleteButton action={deletePage.bind(null, p.slug)} itemName={p.title} iconOnly />
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
