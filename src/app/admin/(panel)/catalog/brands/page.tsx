import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, ImageOff } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteBrand } from "./actions";

export const metadata: Metadata = { title: "Бренды" };

interface BrandRow {
  id: string;
  title: string;
  slug: string;
  logo_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_published: boolean;
}

export default async function BrandsPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("brands")
    .select("id,title,slug,logo_url,link_url,sort_order,is_published")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  const brands = (data ?? []) as BrandRow[];

  return (
    <>
      <PageHeader
        title="Бренды"
        description="Полоса логотипов над блогом на главной."
        actions={
          <Link href="/admin/catalog/brands/new">
            <AdminButton>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
            </AdminButton>
          </Link>
        }
      />

      {brands.length === 0 ? (
        <EmptyState
          title="Брендов пока нет"
          hint="Добавьте логотипы партнёров — они появятся полосой над блогом."
          action={
            <Link href="/admin/catalog/brands/new">
              <AdminButton>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить бренд
              </AdminButton>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TH className="w-16">Лого</TH>
            <TH>Название</TH>
            <TH>Slug</TH>
            <TH className="w-20">Порядок</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {brands.map((b) => (
              <TR key={b.id}>
                <TD>
                  <div className="flex h-9 w-12 items-center justify-center overflow-hidden rounded-sm border border-border/60 bg-white">
                    {b.logo_url ? (
                      <Image src={b.logo_url} alt={b.title} width={48} height={36} className="h-full w-full object-contain" />
                    ) : (
                      <ImageOff className="h-4 w-4 text-ink-subtle" strokeWidth={1.5} />
                    )}
                  </div>
                </TD>
                <TD className="font-medium">{b.title}</TD>
                <TD className="text-ink-muted">{b.slug}</TD>
                <TD className="text-ink-muted">{b.sort_order}</TD>
                <TD>
                  {b.is_published ? (
                    <StatusBadge tone="strong">Опубликован</StatusBadge>
                  ) : (
                    <StatusBadge>Скрыт</StatusBadge>
                  )}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/catalog/brands/${b.id}/edit`}>
                      <AdminButton variant="outline" size="sm">
                        Изменить
                      </AdminButton>
                    </Link>
                    <DeleteButton action={deleteBrand.bind(null, b.id)} itemName={b.title} iconOnly />
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
