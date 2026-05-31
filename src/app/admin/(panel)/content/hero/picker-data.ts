import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PickerCategory, PickerProduct } from "./HeroLinkPicker";

/** Категории и товары для пошагового выбора ссылки кнопки слайда. */
export async function loadHeroPickerData(): Promise<{
  categories: PickerCategory[];
  products: PickerProduct[];
}> {
  const db = createSupabaseAdminClient();
  const [cats, prods] = await Promise.all([
    db.from("categories").select("slug,title,parent_slug").order("sort", { ascending: true }),
    db
      .from("products")
      .select("id,title,category_slug")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("title", { ascending: true }),
  ]);

  const categories: PickerCategory[] = (cats.data ?? []).map((c) => ({
    slug: c.slug as string,
    title: c.title as string,
    parentSlug: (c.parent_slug as string | null) ?? null,
  }));
  const products: PickerProduct[] = (prods.data ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    categorySlug: (p.category_slug as string | null) ?? null,
  }));

  return { categories, products };
}
