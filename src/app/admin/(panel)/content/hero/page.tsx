import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, ImageOff } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteHeroSlide } from "./actions";

export const metadata: Metadata = { title: "Hero-баннер" };

interface Row {
  id: string;
  overline: string | null;
  title: string;
  image_url: string | null;
  theme: string;
  sort_order: number;
  is_published: boolean;
}

export default async function HeroPage() {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("hero_slides")
    .select("id,overline,title,image_url,theme,sort_order,is_published")
    .order("sort_order");
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader
        title="Hero-баннер"
        description="Карусель слайдов на главной."
        actions={
          <Link href="/admin/content/hero/new">
            <AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> Добавить слайд</AdminButton>
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Слайдов пока нет"
          hint="Добавьте первый слайд карусели на главной."
          action={
            <Link href="/admin/content/hero/new">
              <AdminButton><Plus className="h-4 w-4" strokeWidth={2} /> Добавить слайд</AdminButton>
            </Link>
          }
        />
      ) : (
        <Table>
          <THead>
            <TH className="w-20">Превью</TH>
            <TH>Заголовок</TH>
            <TH className="w-24">Тема</TH>
            <TH className="w-20">Порядок</TH>
            <TH className="w-28">Статус</TH>
            <TH className="w-px text-right">Действия</TH>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD>
                  <div className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-sm border border-border/60 bg-surface">
                    {r.image_url ? (
                      <Image src={r.image_url} alt="" width={64} height={40} className="h-full w-full object-contain" />
                    ) : (
                      <ImageOff className="h-4 w-4 text-ink-subtle" strokeWidth={1.5} />
                    )}
                  </div>
                </TD>
                <TD>
                  <div className="font-medium">{r.title}</div>
                  {r.overline ? <div className="text-[12px] text-ink-subtle">{r.overline}</div> : null}
                </TD>
                <TD className="text-ink-muted">{r.theme === "light" ? "Светлая" : "Тёмная"}</TD>
                <TD className="text-ink-muted">{r.sort_order}</TD>
                <TD>{r.is_published ? <StatusBadge tone="strong">Активен</StatusBadge> : <StatusBadge>Черновик</StatusBadge>}</TD>
                <TD>
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/admin/content/hero/${r.id}/edit`}>
                      <AdminButton variant="outline" size="sm">Изменить</AdminButton>
                    </Link>
                    <DeleteButton action={deleteHeroSlide.bind(null, r.id)} itemName={r.title} iconOnly />
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
