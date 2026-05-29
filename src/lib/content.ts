import { supabase } from "@/lib/supabase/client";

/**
 * Геттеры контента, управляемого из админки (hero, преимущества, бренды,
 * trade-in, bento, блог, статические страницы). Читают опубликованные строки
 * из Supabase через anon-клиент (RLS). При отсутствии env/строк возвращают
 * пустое — вызывающий код подставляет свои дефолты (сайт не ломается).
 */

export interface HeroSlideRow {
  id: string;
  overline: string | null;
  title: string;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  theme: "dark" | "light";
}

export async function getHeroSlides(): Promise<HeroSlideRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id,overline,title,description,button_text,button_link,image_url,theme")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as HeroSlideRow[];
}

export interface AdvantageRow {
  id: string;
  icon: string | null;
  title: string;
  description: string | null;
}

export async function getAdvantages(): Promise<AdvantageRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("advantages")
    .select("id,icon,title,description")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as AdvantageRow[];
}

export interface BrandRow {
  id: string;
  title: string;
  logo_url: string | null;
  link_url: string | null;
}

export async function getBrands(): Promise<BrandRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("brands")
    .select("id,title,logo_url,link_url")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as BrandRow[];
}

export interface TradeInBlockRow {
  block_title: string;
  block_description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
}
export interface TradeInStepRow {
  id: string;
  step_number: number;
  title: string;
  description: string | null;
}

export async function getTradeInBlock(): Promise<TradeInBlockRow | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("trade_in_block")
    .select("block_title,block_description,button_text,button_link,image_url")
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();
  return (data as TradeInBlockRow) ?? null;
}

export async function getTradeInSteps(): Promise<TradeInStepRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("trade_in_steps")
    .select("id,step_number,title,description")
    .order("sort_order", { ascending: true });
  return (data as TradeInStepRow[]) ?? [];
}

export interface BlogPostCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
  content?: string | null;
  category_id?: string | null;
  category?: string | null;
}

export async function getBlogPosts(limit?: number): Promise<BlogPostCard[]> {
  if (!supabase) return [];
  let q = supabase
    .from("blog_posts")
    .select("id,slug,title,excerpt,cover_url,published_at,blog_categories(title)")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (limit) q = q.limit(limit);
  const { data } = await q;
  if (!data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    excerpt: (r.excerpt as string) ?? null,
    cover_url: (r.cover_url as string) ?? null,
    published_at: (r.published_at as string) ?? null,
    category: (r.blog_categories as { title?: string } | null)?.title ?? null,
  }));
}

export async function getBlogPost(slug: string): Promise<BlogPostCard | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("blog_posts")
    .select("id,slug,title,excerpt,cover_url,published_at,content,category_id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as BlogPostCard) ?? null;
}

export interface ShopContacts {
  name?: string;
  address?: string;
  working_hours?: string;
  phone?: string;
  email?: string;
  vk?: string;
  whatsapp?: string;
  telegram?: string;
}

/** Контакты магазина из настроек (shop_settings key='general'). */
export async function getShopContacts(): Promise<ShopContacts | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "general").maybeSingle();
  return ((data?.value as ShopContacts) ?? null) || null;
}

export interface StaticPageRow {
  slug: string;
  title: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

export async function getStaticPage(slug: string): Promise<StaticPageRow | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("static_pages")
    .select("slug,title,content,meta_title,meta_description")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as StaticPageRow) ?? null;
}
