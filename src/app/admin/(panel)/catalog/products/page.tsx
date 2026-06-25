import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, ImageOff, Settings, Table2 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rangeFor } from "@/lib/admin/mutations";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton } from "@/components/admin/form";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SearchBox, FilterSelect, CategoryFilter, Pagination, SortHeader } from "@/components/admin/ListControls";
import { deleteProduct } from "./actions";

export const metadata: Metadata = { title: "Товары" };

const PAGE_SIZE = 20;
const STATUS_LABEL: Record<string, string> = { published: "Опубликован", draft: "Черновик", archived: "Архив" };
// Ключ сортировки (из URL) → колонка БД. По умолчанию — по названию.
const SORT_COLUMNS: Record<string, string> = {
  title: "title", category: "category_slug", cash: "price_cash", card: "price_card", stock: "stock", status: "status",
};

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

  const { data: cats } = await db.from("categories").select("slug,title,parent_slug").order("sort");
  const categories = (cats ?? []) as { slug: string; title: string; parent_slug: string | null }[];
  // Дерево для фильтра: родители + их подкатегории.
  const categoryTree = categories
    .filter((c) => !c.parent_slug)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      children: categories.filter((c) => c.parent_slug === p.slug).map((c) => ({ slug: c.slug, title: c.title })),
    }));
  const childrenOf = (slug: string) => categories.filter((c) => c.parent_slug === slug).map((c) => c.slug);

  let query = db
    .from("products")
    .select("id,title,category_slug,image,price_cash,price_card,stock,status,type,badge", { count: "exact" })
    .is("deleted_at", null);

  // Категория-родитель агрегирует подкатегории; точная подкатегория — точный фильтр.
  if (sp.subcategory) {
    query = query.eq("category_slug", sp.subcategory);
  } else if (sp.category) {
    const kids = childrenOf(sp.category);
    query = kids.length > 0 ? query.in("category_slug", [sp.category, ...kids]) : query.eq("category_slug", sp.category);
  }
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.type) query = query.eq("type", sp.type);
  if (sp.q) query = query.or(`title.ilike.%${sp.q}%,sku.ilike.%${sp.q}%,model.ilike.%${sp.q}%`);

  // Сортировка из URL (по умолчанию — по названию, A→Я). id как вторичный ключ для стабильной пагинации.
  const sortKey = sp.sort && SORT_COLUMNS[sp.sort] ? sp.sort : "title";
  const ascending = sp.dir !== "desc";
  const [from, to] = rangeFor(page, PAGE_SIZE);
  const { data, count } = await query
    .order(SORT_COLUMNS[sortKey], { ascending, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, to);

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
  const hasFilters = !!(sp.q || sp.category || sp.subcategory || sp.status || sp.type);

  return (
    <>
      <PageHeader
        title="Товары"
        description={`Всего: ${total}. Новые и Б/У, цены, наличие, статус.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/catalog/pricing">
              <AdminButton variant="outline">
                <Table2 className="h-4 w-4" strokeWidth={1.75} /> Прайс
              </AdminButton>
            </Link>
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
        <CategoryFilter tree={categoryTree} />
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
              <TH><SortHeader column="title" label="Название" /></TH>
              <TH className="w-28"><SortHeader column="category" label="Категория" /></TH>
              <TH className="w-28"><SortHeader column="cash" label="Наличными" /></TH>
              <TH className="w-24"><SortHeader column="card" label="Картой" /></TH>
              <TH className="w-20"><SortHeader column="stock" label="Остаток" /></TH>
              <TH className="w-28"><SortHeader column="status" label="Статус" /></TH>
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
