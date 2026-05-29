import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, ImageOff } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteBentoTile } from "./actions";

export const metadata: Metadata = { title: "Bento-плитки" };

interface Row {
  id: string;
  category_slug: string | null;
  custom_title: string | null;
  custom_image_url: string | null;
  size: string;
  sort_order: number;
  is_published: boolean;
}

export default async function BentoPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("bento_tiles")
    .select("id,category_slug,custom_title,custom_image_url,size,sort_order,is_published")
    .order("sort_order");
  const rows = (data ?? []) as Row[];

  const sizeLabel: Record<string, string> = {
    large: "Большой",
    medium: "Средний",
    small: "Маленький",
  };

  return (
    <>
      <PageHeader
        title="Bento-плитки"
        description="Крупные плитки «Каталог Apple» на главной."
        actions={
          <Link href="/admin/content/bento/new">
            <AdminButton>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
            </AdminButton>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Плиток пока нет"
          hint="Добавьте первую bento-плитку для главной страницы."
          action={
            <Link href="/admin/content/bento/new">
              <AdminButton>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
              </AdminButton>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TH className="w-20">Превью</TH>
            <TH>Заголовок</TH>
            <TH className="w-28">Размер</TH>
            <TH className="w-20">Порядок</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD>
                  <div className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-sm border border-border/60 bg-surface">
                    {r.custom_image_url ? (
                      <Image
                        src={r.custom_image_url}
                        alt=""
                        width={64}
                        height={40}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImageOff className="h-4 w-4 text-ink-subtle" strokeWidth={1.5} />
                    )}
                  </div>
                </TD>
                <TD>
                  <div className="font-medium">
                    {r.custom_title ?? r.category_slug ?? "—"}
                  </div>
                  {r.category_slug && r.custom_title ? (
                    <div className="text-[12px] text-ink-subtle">{r.category_slug}</div>
                  ) : null}
                </TD>
                <TD className="text-ink-muted">{sizeLabel[r.size] ?? r.size}</TD>
                <TD className="text-ink-muted">{r.sort_order}</TD>
                <TD>
                  {r.is_published ? (
                    <StatusBadge tone="strong">Активна</StatusBadge>
                  ) : (
                    <StatusBadge>Черновик</StatusBadge>
                  )}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/content/bento/${r.id}/edit`}>
                      <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                    </Link>
                    <DeleteButton
                      action={deleteBentoTile.bind(null, r.id)}
                      itemName={r.custom_title ?? r.category_slug ?? r.id}
                      iconOnly
                    />
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
