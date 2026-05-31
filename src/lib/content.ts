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

export interface NavCategoryNode extends NavCategory {
  children: { slug: string; title: string }[];
}

/** Дерево навигации: верхний уровень + дочерние серии (для вложенного меню). */
export async function getNavCategoryTree(): Promise<NavCategoryNode[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("slug,title,icon_url,sort,parent_slug")
    .eq("is_published", true)
    .neq("slug", "trade-in")
    .order("sort", { ascending: true });
  const all = (data ?? []) as { slug: string; title: string; icon_url: string | null; parent_slug: string | null }[];
  return all
    .filter((c) => !c.parent_slug)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      icon_url: p.icon_url ?? null,
      children: all.filter((c) => c.parent_slug === p.slug).map((c) => ({ slug: c.slug, title: c.title })),
    }));
}

/** Категории для меню/шапки (с иконкой), без trade-in. */
export async function getNavCategories(): Promise<NavCategory[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("slug,title,icon_url,sort")
    .eq("is_published", true)
    .is("parent_slug", null)
    .neq("slug", "trade-in")
    .order("sort", { ascending: true });
  return ((data ?? []) as NavCategory[]).map((c) => ({ slug: c.slug, title: c.title, icon_url: c.icon_url ?? null }));
}

export interface CategoryMeta {
  title: string;
  description: string | null;
  subtitle: string | null;
  icon_url: string | null;
  seo_text: string | null;
  available_filters: string[] | null;
}

/** Мета категории из БД (название, описание, иконка, SEO-текст, фильтры). */
export async function getCategoryMeta(slug: string): Promise<CategoryMeta | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("categories")
    .select("title,description,subtitle,icon_url,seo_text,available_filters")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const d = data as Record<string, unknown>;
  return {
    title: (d.title as string) ?? slug,
    description: (d.description as string | null) ?? null,
    subtitle: (d.subtitle as string | null) ?? null,
    icon_url: (d.icon_url as string | null) ?? null,
    seo_text: (d.seo_text as string | null) ?? null,
    available_filters: Array.isArray(d.available_filters) ? (d.available_filters as string[]) : null,
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
  /** К какому типу товара применима опция в отображении карточки. */
  applies_to?: "new" | "used" | "both";
}

export type BadgeCorner = "tl" | "tr" | "bl" | "br";
export interface CardDisplay {
  cash: boolean;
  card: boolean;
  credit: boolean;
  old_price: boolean;
  badges: boolean;
  /** Ключи опций (из реестра), которые выводить на карточке доп. строками. */
  options: string[];
}
export const DEFAULT_CARD_DISPLAY: CardDisplay = { cash: true, card: true, credit: true, old_price: true, badges: true, options: [] };

/** Настройки отображения карточки товара (shop_settings.card_display). */
export async function getCardDisplay(): Promise<CardDisplay> {
  if (!supabase) return DEFAULT_CARD_DISPLAY;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "card_display").maybeSingle();
  const v = data?.value as Partial<CardDisplay> | null;
  if (!v) return DEFAULT_CARD_DISPLAY;
  return { ...DEFAULT_CARD_DISPLAY, ...v, options: Array.isArray(v.options) ? v.options : [] };
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
  /** Угол на карточке: tl/tr/bl/br (по умолчанию tl — слева сверху). */
  position?: "tl" | "tr" | "bl" | "br";
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

/** Какая цена товара берётся при способе оплаты. */
export type PriceBase = "cash" | "card";

export interface CartPaymentMethod {
  key: string; // произвольный ключ (можно добавлять способы)
  enabled: boolean;
  label: string; // заголовок способа
  note: string; // короткая подпись под заголовком (в радиокнопке)
  description: string; // развёрнутый текст под выбранным способом
  icon: string | null; // имя иконки из единого набора
  priceBase: PriceBase; // какую цену брать за основу (наличными/картой)
  surcharge: number; // наценка в % к выбранной базе (0 — без наценки)
}
export interface CartDeliveryOption {
  key: string; // произвольный ключ
  enabled: boolean;
  label: string;
  note: string;
  description: string; // текст под выбранным способом (адрес ПВЗ / условия)
  icon: string | null;
  requiresAddress: boolean; // нужен адрес доставки (курьер-подобные)
  price: number; // стоимость доставки; 0 — бесплатно
  freeFrom: number; // бесплатно от суммы (0 — порога нет)
}
export interface CartSettings {
  payments: CartPaymentMethod[];
  delivery: CartDeliveryOption[];
}

export const DEFAULT_CART_SETTINGS: CartSettings = {
  payments: [
    { key: "sbp", enabled: true, label: "СБП", note: "Без комиссии, мгновенно", icon: "smartphone", priceBase: "cash", surcharge: 0, description: "После подтверждения заказа откроется приложение вашего банка для оплаты по QR-коду. Без комиссии, без ввода реквизитов." },
    { key: "card", enabled: true, label: "Банковская карта", note: "Visa, Mastercard, Мир", icon: "credit-card", priceBase: "card", surcharge: 0, description: "Оплата картой онлайн по защищённому каналу банка-эквайра." },
    { key: "cash", enabled: true, label: "При получении", note: "Наличные или картой курьеру", icon: "banknote", priceBase: "cash", surcharge: 0, description: "Оплата наличными или картой при получении заказа." },
    { key: "credit", enabled: true, label: "Кредит / Рассрочка", note: "Решение банка за 5 минут", icon: "wallet", priceBase: "card", surcharge: 0, description: "Оформление кредита или рассрочки — решение банка за 5 минут." },
  ],
  delivery: [
    { key: "pickup", enabled: true, label: "Самовывоз", note: "Бесплатно · сегодня", icon: "map-pin", requiresAddress: false, price: 0, freeFrom: 0, description: "Универмаг Белгород, ул. Попова, 36, 1 этаж. Готовим заказ к выдаче в течение часа." },
    { key: "courier", enabled: true, label: "Курьер", note: "Завтра, в удобное время", icon: "truck", requiresAddress: true, price: 0, freeFrom: 0, description: "Доставка по Белгороду в удобное время." },
  ],
};

function mergePayment(p: Partial<CartPaymentMethod>, i: number): CartPaymentMethod {
  return {
    key: p.key ?? `pay-${i}`,
    enabled: p.enabled ?? true,
    label: p.label ?? "",
    note: p.note ?? "",
    description: p.description ?? "",
    icon: p.icon ?? null,
    priceBase: p.priceBase === "card" ? "card" : "cash",
    surcharge: Number(p.surcharge) || 0,
  };
}
function mergeDelivery(d: Partial<CartDeliveryOption>, i: number): CartDeliveryOption {
  return {
    key: d.key ?? `del-${i}`,
    enabled: d.enabled ?? true,
    label: d.label ?? "",
    note: d.note ?? "",
    description: d.description ?? "",
    icon: d.icon ?? null,
    requiresAddress: !!d.requiresAddress,
    price: Number(d.price) || 0,
    freeFrom: Number(d.freeFrom) || 0,
  };
}

export async function getCartSettings(): Promise<CartSettings> {
  if (!supabase) return DEFAULT_CART_SETTINGS;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "cart").maybeSingle();
  const v = data?.value as Partial<CartSettings> | undefined;
  if (!v) return DEFAULT_CART_SETTINGS;
  return {
    payments: v.payments?.length ? v.payments.map(mergePayment) : DEFAULT_CART_SETTINGS.payments,
    delivery: v.delivery?.length ? v.delivery.map(mergeDelivery) : DEFAULT_CART_SETTINGS.delivery,
  };
}

/** ID счётчика Я.Метрики (если интеграция включена). Метрика грузится только
 *  при cookie-согласии на аналитику (см. CookieConsentProvider). */
export async function getMetrikaId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("integrations").select("config,is_enabled").eq("key", "metrika").maybeSingle();
    if (!data || data.is_enabled === false) return null;
    const cfg = (data.config ?? {}) as Record<string, unknown>;
    const id = cfg.counter_id ?? cfg.id ?? cfg.counter ?? null;
    return id ? String(id) : null;
  } catch { return null; }
}

export interface HeroSlideRow {
  id: string;
  overline: string | null;
  title: string;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  bg_color: string | null;
  theme: "dark" | "light";
}

export async function getHeroSlides(): Promise<HeroSlideRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id,overline,title,description,button_text,button_link,image_url,bg_color,theme")
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

/** Управляемая контакт-ссылка (иконка пресет/загруженная, где показывать). */
export interface ShopContactLink {
  id: string;
  label: string; // подпись/aria (напр. WhatsApp)
  value: string; // отображаемый текст (напр. телефон) — необязателен
  href: string; // ссылка (tel:, https://wa.me/…, https://t.me/…)
  icon: string | null; // имя иконки из набора
  iconUrl: string | null; // загруженная иконка (приоритетнее пресета)
  enabled: boolean;
  location: "header" | "footer" | "both";
}

export interface ShopContacts {
  name?: string;
  address?: string;
  working_hours?: string;
  phone?: string;
  phone2?: string;
  email?: string;
  /** Видимость основных контактов в шапке/футере (undefined = показывать). */
  phone_enabled?: boolean;
  phone2_enabled?: boolean;
  email_enabled?: boolean;
  vk?: string;
  whatsapp?: string;
  telegram?: string;
  /** Юр. лицо — ООО «…» или ФИО для ИП. */
  legal_entity?: string;
  /** Управляемый список контакт-ссылок для шапки/футера. */
  contacts?: ShopContactLink[];
}

export const DEFAULT_SHOP_CONTACTS: ShopContactLink[] = [
  { id: "wa", label: "WhatsApp", value: "", href: "https://wa.me/79040988877", icon: "phone", iconUrl: null, enabled: true, location: "both" },
  { id: "tg", label: "Telegram", value: "", href: "https://t.me/phonetradebel", icon: "messages-square", iconUrl: null, enabled: true, location: "both" },
  { id: "vk", label: "ВКонтакте", value: "", href: "https://vk.com/phonetradebel", icon: "thumbs-up", iconUrl: null, enabled: true, location: "footer" },
];

/** Режим технических работ (shop_settings key='general'). */
export async function getSiteMaintenance(): Promise<{ on: boolean; message: string }> {
  if (!supabase) return { on: false, message: "" };
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "general").maybeSingle();
  const v = (data?.value ?? {}) as { maintenance?: boolean; maintenance_message?: string };
  return {
    on: v.maintenance === true,
    message: v.maintenance_message?.trim() || "Сайт временно на технических работах. Скоро вернёмся!",
  };
}

/** Контакты магазина из настроек (shop_settings key='general'). */
export async function getShopContacts(): Promise<ShopContacts | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "general").maybeSingle();
  const v = (data?.value as ShopContacts) ?? null;
  if (!v) return null;
  return {
    ...v,
    contacts: Array.isArray(v.contacts) && v.contacts.length > 0 ? v.contacts : DEFAULT_SHOP_CONTACTS,
  };
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

/** Опубликованные страницы для sitemap (slug + дата изменения). */
export async function getPublishedPageSlugs(): Promise<{ slug: string; updatedAt: string | null }[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("static_pages")
    .select("slug,updated_at")
    .eq("status", "published")
    .limit(1000);
  return ((data as { slug: string; updated_at: string | null }[]) ?? []).map((r) => ({ slug: r.slug, updatedAt: r.updated_at }));
}
