import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { enqueueTrigger } from "./queue";
import { renderItemRows, type EmailItem } from "./product-cards";

/**
 * Детект брошенных корзин (docs/email-marketing.md §6.1). Корзина считается
 * брошенной, если: status='active', есть товары, не обновлялась 1+ час (но в
 * пределах суток), привязана к клиенту с email и ещё не обработана. Ставит в
 * очередь abandoned_cart_1h (сразу) и abandoned_cart_24h (+24ч). Правила
 * согласия применяет процессор очереди (ab1 — service, ab2 — marketing).
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const rub = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export async function detectAbandonedCarts(): Promise<{ detected: number }> {
  const db = createSupabaseAdminClient();
  const now = Date.now();
  const { data: carts } = await db
    .from("carts")
    .select("id,customer_id,email,updated_at")
    .eq("status", "active")
    .is("abandoned_at", null)
    .not("customer_id", "is", null)
    .lt("updated_at", new Date(now - 60 * 60 * 1000).toISOString())
    .gt("updated_at", new Date(now - 25 * 60 * 60 * 1000).toISOString())
    .limit(50);
  if (!carts?.length) return { detected: 0 };

  let detected = 0;
  for (const cart of carts as { id: string; customer_id: string; email: string | null; updated_at: string }[]) {
    if (!cart.email) continue;
    const { data: lines } = await db.from("cart_items").select("product_id,qty").eq("cart_id", cart.id);
    if (!lines?.length) continue;
    const ids = (lines as { product_id: string; qty: number }[]).map((l) => l.product_id);
    const { data: prods } = await db.from("products").select("id,title,image,price_cash").in("id", ids).eq("status", "published").is("deleted_at", null);
    const byId = new Map(((prods ?? []) as { id: string; title: string; image: string | null; price_cash: number }[]).map((p) => [p.id, p]));
    const items: EmailItem[] = [];
    let total = 0;
    for (const l of lines as { product_id: string; qty: number }[]) {
      const p = byId.get(l.product_id);
      if (!p) continue;
      items.push({ image: p.image, title: p.title, qty: l.qty, price: p.price_cash });
      total += p.price_cash * l.qty;
    }
    if (!items.length) continue;

    const { data: cust } = await db.from("customers").select("name").eq("id", cart.customer_id).maybeSingle();
    const firstName = (cust?.name ?? "").split(/\s+/)[0] || "";
    const vars = {
      customer: { first_name: firstName, name: cust?.name ?? "" },
      cart: { items: renderItemRows(items), total: rub(total), url: `${SITE}/cart` },
    };
    await enqueueTrigger({ triggerSlug: "abandoned_cart_1h", customerId: cart.customer_id, recipientEmail: cart.email, variables: vars, scheduledAt: new Date(now), dedupKey: `cart:${cart.id}:ab1` });
    await enqueueTrigger({ triggerSlug: "abandoned_cart_24h", customerId: cart.customer_id, recipientEmail: cart.email, variables: vars, scheduledAt: new Date(now + 24 * 60 * 60 * 1000), dedupKey: `cart:${cart.id}:ab2` });
    await db.from("carts").update({ abandoned_at: new Date().toISOString() }).eq("id", cart.id);
    detected++;
  }
  return { detected };
}
