import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { renderProductCards, type EmailProduct } from "./product-cards";

/**
 * Карточки избранных товаров для писем (реальные фото из каталога). По умолчанию
 * — топовые новые iPhone. Рендерится в HTML на месте плейсхолдера {{products}}.
 */
export async function getFeaturedCardsHtml(opts?: { categoryPrefix?: string; limit?: number }): Promise<string> {
  try {
    const db = createSupabaseAdminClient();
    let q = db
      .from("products")
      .select("id,title,image,price_cash,price_card,category_slug")
      .eq("status", "published")
      .eq("type", "new")
      .not("image", "is", null)
      .neq("image", "")
      .order("price_cash", { ascending: false })
      .limit(opts?.limit ?? 4);
    if (opts?.categoryPrefix) q = q.like("category_slug", `${opts.categoryPrefix}%`);
    const { data } = await q;
    const cards: EmailProduct[] = (data ?? []).map((p) => ({
      image: p.image as string, title: p.title as string,
      priceCash: p.price_cash as number, priceCard: p.price_card as number,
      url: `/product/${p.id}`,
    }));
    return renderProductCards(cards);
  } catch {
    return "";
  }
}
