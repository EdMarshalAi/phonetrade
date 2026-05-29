import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, ImageOff, Settings } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SearchBox, FilterSelect, Pagination } from "@/components/admin/ListControls";
import { deleteProduct } from "./actions";

export const metadata: Metadata = { title: "Товары" };

const PAGE_SIZE = 20;
const STATUS_LABEL: Record<string, string> = { published: "Опубликован", draft: "Черновик", archived: "Архив" };

function fmt(n: number | null): string {
  return n == null ? "—" : new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = createSupabaseAdminClient();

  let query = db
    .from("products")
    .select("id,title,category_slug,image,price_cash,price_card,stock,status,type,badge", { count: "exact" })
    .is("deleted_at", null);

  if (sp.category) query = query.eq("category_slug", sp.category);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.type) query = query.eq("type", sp.type);
  if (sp.q) query = query.or(`title.ilike.%${sp.q}%,sku.ilike.%${sp.q}%,model.ilike.%${sp.q}%`);

  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, to);

  const { data: cats } = await db.from("categories").select("slug,title").order("sort");
  const categories = (cats ?? []) as { slug: string; title: string }[];

  const rows = (data ?? []) as {
    id: string;
    title: string;
    category_slug: string;
    image: string | null;
    price_cash: number | null;
    price_card: number | null;
    stock: number | null;
    status: string;
    type: string;
    badge: string | null;
  }[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = !!(sp.q || sp.category || sp.status || sp.type);

  return (
    <>
      <PageHeader
        title="Товары"
        description={`Всего: ${total}. Новые и Б/У, цены, наличие, статус.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/catalog/products/settings">
              <AdminButton variant="outline">
                <Settings className="h-4 w-4" strokeWidth={1.75} /> Настройки
              </AdminButton>
            </Link>
            <Link href="/admin/catalog/products/new">
              <AdminButton>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить
              </AdminButton>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Поиск по названию, SKU, модели…" />
        <FilterSelect param="category" allLabel="Все категории" options={categories.map((c) => ({ value: c.slug, label: c.title }))} />
        <FilterSelect param="status" allLabel="Все статусы" options={[{ value: "published", label: "Опубликован" }, { value: "draft", label: "Черновик" }, { value: "archived", label: "Архив" }]} />
        <FilterSelect param="type" allLabel="Все типы" options={[{ value: "new", label: "Новые" }, { value: "used", label: "Б/У" }]} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "Ничего не найдено" : "Товаров пока нет"}
          hint={hasFilters ? "Измените фильтры или поиск." : undefined}
          action={
            !hasFilters ? (
              <Link href="/admin/catalog/products/new">
                <AdminButton>
                  <Plus className="h-4 w-4" strokeWidth={2} /> Добавить товар
                </AdminButton>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TH className="w-14" />
              <TH>Название</TH>
              <TH className="w-28">Категория</TH>
              <TH className="w-28">Наличными</TH>
              <TH className="w-24">Картой</TH>
              <TH className="w-20">Остаток</TH>
              <TH className="w-28">Статус</TH>
              <TH className="w-px text-right">Действия</TH>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-sm border border-border/60 bg-white">
                      {p.image ? (
                        <Image src={p.image} alt={p.title} width={40} height={40} className="h-full w-full object-contain" />
                      ) : (
                        <ImageOff className="h-4 w-4 text-ink-subtle" strokeWidth={1.5} />
                      )}
                    </div>
                  </TD>
                  <TD>
                    <Link href={`/admin/catalog/products/${p.id}/edit`} className="font-medium text-ink hover:underline">
                      {p.title}
                    </Link>
                    {p.type === "used" ? <span className="ml-2 text-[11px] text-ink-subtle">Б/У</span> : null}
                  </TD>
                  <TD className="text-ink-muted">{categories.find((c) => c.slug === p.category_slug)?.title ?? p.category_slug}</TD>
                  <TD className="font-medium text-sale">{fmt(p.price_cash)}</TD>
                  <TD className="text-ink-muted">{fmt(p.price_card)}</TD>
                  <TD className="text-ink-muted">{p.stock == null ? "—" : p.stock}</TD>
                  <TD>
                    <StatusBadge tone={p.status === "published" ? "strong" : p.status === "archived" ? "danger" : "neutral"}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </StatusBadge>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/catalog/products/${p.id}/edit`}>
                        <AdminButton variant="outline" size="sm">
                          Изменить
                        </AdminButton>
                      </Link>
                      <DeleteButton action={deleteProduct.bind(null, p.id)} itemName={p.title} iconOnly />
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
