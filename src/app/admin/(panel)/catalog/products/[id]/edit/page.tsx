import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/form";
import { ProductForm, type ProductValue } from "../../ProductForm";
import type { ProductImage } from "../../VariantsManager";
import { productImages } from "@/lib/utils/product-images";

export const metadata: Metadata = { title: "Товар" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createSupabaseAdminClient();
  const [{ data: prod }, { data: cats }, { data: varRows }] = await Promise.all([
    db.from("products").select("*").eq("id", id).maybeSingle(),
    db.from("categories").select("slug,title").order("sort"),
    db.from("product_variants").select("*").eq("product_id", id).order("sort_order"),
  ]);

  if (!prod) notFound();
  const categories = (cats ?? []) as { slug: string; title: string }[];
  const product = { ...prod, id } as ProductValue;

  // Галерея берётся из тех же колонок, что и сайт (image + gallery), а не из
  // отдельной таблицы — чтобы в админке и на витрине были одинаковые фото.
  const imgRows: ProductImage[] = productImages({
    image: (prod.image as string) ?? "",
    gallery: Array.isArray(prod.gallery) ? (prod.gallery as string[]) : undefined,
  }).map((url, i) => ({
    id: url,
    product_id: id,
    variant_id: null,
    url,
    alt: null,
    sort_order: i,
    is_primary: url === prod.image,
  }));

  return (
    <>
      <PageHeader
        title={prod.title}
        description="Редактирование товара."
        actions={
          <Link href={`/product/${id}`} target="_blank">
            <AdminButton variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} /> На сайте
            </AdminButton>
          </Link>
        }
      />
      <ProductForm
        product={product}
        categories={categories}
        variants={varRows ?? []}
        images={imgRows ?? []}
      />
    </>
  );
}
