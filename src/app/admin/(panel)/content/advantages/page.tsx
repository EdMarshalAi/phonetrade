import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteAdvantage } from "./actions";

export const metadata: Metadata = { title: "Преимущества" };

interface Row {
  id: string;
  icon: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
}

export default async function AdvantagesPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("advantages")
    .select("id,icon,title,description,sort_order,is_published")
    .order("sort_order");
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader
        title="Преимущества"
        description="Блок «Почему выбирают PhoneTrade» на главной."
        actions={
          <Link href="/admin/content/advantages/new">
            <AdminButton>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
            </AdminButton>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Преимуществ пока нет"
          action={
            <Link href="/admin/content/advantages/new">
              <AdminButton>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
              </AdminButton>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TH className="w-20">Порядок</TH>
            <TH>Заголовок</TH>
            <TH>Иконка</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD className="text-ink-muted">{r.sort_order}</TD>
                <TD className="font-medium">{r.title}</TD>
                <TD className="text-ink-muted">{r.icon ?? "—"}</TD>
                <TD>{r.is_published ? <StatusBadge tone="strong">Опубликовано</StatusBadge> : <StatusBadge>Скрыто</StatusBadge>}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/content/advantages/${r.id}/edit`}>
                      <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                    </Link>
                    <DeleteButton action={deleteAdvantage.bind(null, r.id)} itemName={r.title} iconOnly />
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
