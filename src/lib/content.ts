import { supabase } from "@/lib/supabase/client";
import { getProductsByCategory } from "@/lib/products";
import type { CategorySlug, Product } from "@/lib/data/products";

export interface HomeCategoryRail {
  slug: string;
  title: string;
  products: Product[];
}

/**
 * Ряды товаров на главной по категориям с флагом show_on_home (лимит home_limit).
 * Если ни одна категория не помечена — возвращает [] (главная покажет дефолтные ряды).
 */
export async function getHomeCategoryRails(): Promise<HomeCategoryRail[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("slug,title,home_limit,sort")
    .eq("show_on_home", true)
    .eq("is_published", true)
    .order("sort", { ascending: true });
  if (!data || data.length === 0) return [];
  const cats = data as { slug: string; title: string; home_limit: number }[];
  const rails = await Promise.all(
    cats.map(async (c) => ({
      slug: c.slug,
      title: c.title,
      products: (await getProductsByCategory(c.slug as CategorySlug)).slice(0, c.home_limit ?? 8),
    }))
  );
  return rails.filter((r) => r.products.length > 0);
}

/**
 * Геттеры контента, управляемого из админки (hero, преимущества, бренды,
 * trade-in, bento, блог, статические страницы). Читают опубликованные строки
 * из Supabase через anon-клиент (RLS). При отсутствии env/строк возвращают
 * пустое — вызывающий код подставляет свои дефолты (сайт не ломается).
 */

export interface MenuLink {
  title: string;
  href: string;
}

/** Пункты меню по расположению (top|main|footer) из menu_items. */
export async function getMenu(location: "top" | "main" | "footer"): Promise<MenuLink[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("menu_items")
    .select("title,link_url,sort_order")
    .eq("menu_location", location)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });
  return ((data ?? []) as { title: string; link_url: string | null }[]).map((m) => ({ title: m.title, href: m.link_url || "#" }));
}

export interface NavCategory {
  slug: string;
  title: string;
  icon_url: string | null;
}

/** Категории для меню/шапки (с иконкой), без trade-in. */
export async function getNavCategories(): Promise<NavCategory[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("slug,title,icon_url,sort")
    .eq("is_published", true)
    .neq("slug", "trade-in")
    .order("sort", { ascending: true });
  return ((data ?? []) as NavCategory[]).map((c) => ({ slug: c.slug, title: c.title, icon_url: c.icon_url ?? null }));
}

export interface CategoryMeta {
  title: string;
  icon_url: string | null;
  seo_text: string | null;
  available_filters: string[] | null;
}

/** Мета категории из БД (иконка + SEO-текст + включённые фильтры). */
export async function getCategoryMeta(slug: string): Promise<CategoryMeta | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("categories")
    .select("title,icon_url,seo_text,available_filters")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    ...(data as Omit<CategoryMeta, "available_filters">),
    available_filters: Array.isArray((data as { available_filters?: unknown }).available_filters)
      ? ((data as { available_filters: string[] }).available_filters)
      : null,
  };
}

// ── Реестр опций и бейджей товаров (shop_settings) ───────────────────────────

/** Тип-опция (характеристика-фильтр) со справочником значений. */
export interface ProductOption {
  key: string;
  label: string;
  /** Колонка products для базовых опций (color/memory/sim/condition) или null для кастомных. */
  field: string | null;
  values: string[];
  sort: number;
}

/** Бейдж с настраиваемыми цветами, иконкой и подсказкой. */
export interface ProductBadge {
  key: string;
  label: string;
  bg: string;
  fg: string;
  /** Имя иконки из единого набора (lib/admin/icons) или null. */
  icon?: string | null;
  tooltip?: string;
  sort: number;
}

/** Дефолты — если в БД реестра ещё нет (фолбэк, чтобы витрина не ломалась). */
export const DEFAULT_PRODUCT_BADGES: ProductBadge[] = [
  { key: "new", label: "Новинка", bg: "#1d1d1f", fg: "#ffffff", icon: "zap", tooltip: "", sort: 0 },
  { key: "no-rustore", label: "Без RuStore", bg: "#1d1d1f", fg: "#ffffff", icon: null, tooltip: "Имеет недостаток в виде невозможности предустановки RuStore", sort: 1 },
  { key: "in-stock", label: "В наличии", bg: "#ffffff", fg: "#1d1d1f", icon: "check", tooltip: "", sort: 2 },
  { key: "check-availability", label: "Уточняйте наличие", bg: "#ffffff", fg: "#1d1d1f", icon: "clock", tooltip: "", sort: 3 },
];

export async function getProductOptions(): Promise<ProductOption[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "product_options").maybeSingle();
  const arr = (data?.value as ProductOption[] | undefined) ?? [];
  return [...arr].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

export async function getProductBadges(): Promise<ProductBadge[]> {
  if (!supabase) return DEFAULT_PRODUCT_BADGES;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "product_badges").maybeSingle();
  const arr = (data?.value as ProductBadge[] | undefined) ?? null;
  if (!arr || arr.length === 0) return DEFAULT_PRODUCT_BADGES;
  return [...arr].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
}

// ── Информационные блоки (иконка + заголовок + текст) ────────────────────────

/** Универсальный инфоблок: под товаром и под кнопкой заказа. */
export interface InfoBlock {
  icon: string | null;
  title: string;
  text: string;
  href?: string;
}

/** Блоки под товаром (страница товара): самовывоз/доставка/гарантия/trade-in. */
export const DEFAULT_PRODUCT_BLOCKS: InfoBlock[] = [
  { icon: "map-pin", title: "Самовывоз", text: "В Универмаге Белгород · ул. Попова, 36" },
  { icon: "truck", title: "Доставка по Белгороду", text: "Сегодня или завтра — курьер привезёт в удобное время" },
  { icon: "shield-check", title: "Гарантия 12 + 12 месяцев", text: "Магазинная PhoneTrade плюс гарантия производителя Apple" },
  { icon: "refresh-cw", title: "Trade-in сразу", text: "Сдайте старое устройство Apple и вычтем его сумму из цены", href: "/trade-in" },
];

/** Блоки под кнопкой «Подтвердить заказ» в корзине. */
export const DEFAULT_CHECKOUT_BLOCKS: InfoBlock[] = [
  { icon: "shield-check", title: "Безопасная оплата", text: "Защищённый канал, без сохранения карты" },
  { icon: "refresh-cw", title: "Лёгкий возврат", text: "14 дней на возврат без объяснений" },
  { icon: "heart-handshake", title: "Поддержка после покупки", text: "Настроим Apple ID и перенесём данные бесплатно" },
];

async function getBlocks(key: string, fallback: InfoBlock[]): Promise<InfoBlock[]> {
  if (!supabase) return fallback;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", key).maybeSingle();
  const arr = data?.value as InfoBlock[] | undefined;
  return arr && arr.length > 0 ? arr : fallback;
}

export const getProductBlocks = () => getBlocks("product_blocks", DEFAULT_PRODUCT_BLOCKS);
export const getCheckoutBlocks = () => getBlocks("checkout_blocks", DEFAULT_CHECKOUT_BLOCKS);

// ── Настройки корзины: оплата, доставка ──────────────────────────────────────

export type PaymentKey = "sbp" | "card" | "cash" | "credit";
export type DeliveryKey = "pickup" | "courier";

export interface CartPaymentMethod {
  key: PaymentKey;
  enabled: boolean;
  label: string;
  note: string;
}
export interface CartDeliveryOption {
  key: DeliveryKey;
  enabled: boolean;
  label: string;
  note: string;
  price: number; // цена доставки (для курьера); 0 — бесплатно
  freeFrom: number; // бесплатно от суммы (0 — всегда бесплатно)
}
export interface CartSettings {
  payments: CartPaymentMethod[];
  delivery: CartDeliveryOption[];
}

export const DEFAULT_CART_SETTINGS: CartSettings = {
  payments: [
    { key: "sbp", enabled: true, label: "СБП", note: "Без комиссии, мгновенно" },
    { key: "card", enabled: true, label: "Банковская карта", note: "Visa, Mastercard, Мир" },
    { key: "cash", enabled: true, label: "При получении", note: "Наличные или картой курьеру" },
    { key: "credit", enabled: true, label: "Кредит / Рассрочка", note: "Решение банка за 5 минут" },
  ],
  delivery: [
    { key: "pickup", enabled: true, label: "Самовывоз", note: "Бесплатно · сегодня", price: 0, freeFrom: 0 },
    { key: "courier", enabled: true, label: "Курьер", note: "Завтра, в удобное время", price: 0, freeFrom: 0 },
  ],
};

export async function getCartSettings(): Promise<CartSettings> {
  if (!supabase) return DEFAULT_CART_SETTINGS;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "cart").maybeSingle();
  const v = data?.value as Partial<CartSettings> | undefined;
  if (!v) return DEFAULT_CART_SETTINGS;
  return {
    payments: v.payments?.length ? v.payments : DEFAULT_CART_SETTINGS.payments,
    delivery: v.delivery?.length ? v.delivery : DEFAULT_CART_SETTINGS.delivery,
  };
}

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

export interface HomeBlocksVisibility {
  bento: boolean;
  trade_in: boolean;
  advantages: boolean;
}

/** Видимость управляемых блоков главной (shop_settings key='home_blocks'). По умолчанию всё включено. */
export async function getHomeBlocksVisibility(): Promise<HomeBlocksVisibility> {
  const def: HomeBlocksVisibility = { bento: true, trade_in: true, advantages: true };
  if (!supabase) return def;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "home_blocks").maybeSingle();
  const v = (data?.value ?? {}) as Partial<HomeBlocksVisibility>;
  return {
    bento: v.bento !== false,
    trade_in: v.trade_in !== false,
    advantages: v.advantages !== false,
  };
}

export interface BentoTileRow {
  id: string;
  category_slug: string | null;
  custom_title: string | null;
  subtitle: string | null;
  custom_image_url: string | null;
  size: "large" | "medium" | "small";
  theme: "dark" | "light";
  category_title: string | null;
  category_image: string | null;
}

/** Bento-плитки блока «Каталог Apple» (с подтянутыми title/image категории). */
export async function getBentoTiles(): Promise<BentoTileRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("bento_tiles")
    .select("id,category_slug,custom_title,subtitle,custom_image_url,size,theme,sort_order,categories(title,image)")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map((r) => {
    const cat = r.categories as { title?: string; image?: string } | null;
    return {
      id: r.id as string,
      category_slug: (r.category_slug as string) ?? null,
      custom_title: (r.custom_title as string) ?? null,
      subtitle: (r.subtitle as string) ?? null,
      custom_image_url: (r.custom_image_url as string) ?? null,
      size: (r.size as BentoTileRow["size"]) ?? "medium",
      theme: (r.theme as BentoTileRow["theme"]) ?? "light",
      category_title: cat?.title ?? null,
      category_image: cat?.image ?? null,
    };
  });
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
