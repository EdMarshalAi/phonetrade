import { z } from "zod";

/** Схема входа в админку. */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Введите email").email("Некорректный email"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginInput = z.infer<typeof loginSchema>;

const slugField = z
  .string()
  .trim()
  .min(1, "Укажите slug")
  .regex(/^[a-z0-9-]+$/, "Только латиница в нижнем регистре, цифры и дефис");

/* ── Бренды ───────────────────────────────────────────────────────────── */
export const brandSchema = z.object({
  title: z.string().trim().min(1, "Укажите название"),
  slug: slugField,
  logo_url: z.string().trim().url("Некорректный URL").or(z.literal("")).nullable().optional(),
  link_url: z.string().trim().url("Некорректный URL").or(z.literal("")).nullable().optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_published: z.boolean().default(true),
});
export type BrandInput = z.infer<typeof brandSchema>;
export type BrandFormValues = z.input<typeof brandSchema>;

/* ── Категории ────────────────────────────────────────────────────────── */
export const categorySchema = z.object({
  title: z.string().trim().min(1, "Укажите название"),
  slug: slugField,
  parent_slug: z.string().trim().nullable().optional(),
  subtitle: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  image: z.string().trim().nullable().optional(),
  icon_url: z.string().trim().nullable().optional(),
  meta_title: z.string().trim().nullable().optional(),
  meta_description: z.string().trim().nullable().optional(),
  seo_text: z.string().nullable().optional(),
  sort: z.coerce.number().int().min(0).default(0),
  show_on_home: z.boolean().default(false),
  home_limit: z.coerce.number().int().min(1).max(24).default(8),
  available_filters: z.array(z.string()).default([]),
  is_published: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categorySchema>;
export type CategoryFormValues = z.input<typeof categorySchema>;

/* ── Товары ───────────────────────────────────────────────────────────── */
export const productSchema = z.object({
  title: z.string().trim().min(1, "Укажите название"),
  slug: z.string().trim().regex(/^[a-z0-9-]*$/, "Латиница, цифры, дефис").nullable().optional(),
  sku: z.string().trim().nullable().optional(),
  category_slug: z.string().trim().min(1, "Выберите категорию"),
  model: z.string().trim().nullable().optional(),
  color: z.string().trim().nullable().optional(),
  memory: z.string().trim().nullable().optional(),
  sim: z.string().trim().nullable().optional(),
  condition: z.string().trim().nullable().optional(),
  type: z.enum(["new", "used"]).default("new"),
  badge: z.string().trim().nullable().optional(),
  badges: z.array(z.string()).default([]),
  options: z.record(z.string(), z.string()).default({}),
  short_description: z.string().trim().nullable().optional(),
  image: z.string().trim().nullable().optional(),
  price_cash: z.coerce.number().int().min(0).default(0),
  price_card: z.coerce.number().int().min(0).default(0),
  price_old: z.coerce.number().int().min(0).nullable().optional(),
  cost_rub: z.coerce.number().min(0).nullable().optional(),
  cost_rate: z.coerce.number().min(0).nullable().optional(),
  price_override: z.boolean().default(false),
  override_price_cash: z.coerce.number().int().min(0).nullable().optional(),
  override_price_card: z.coerce.number().int().min(0).nullable().optional(),
  installment_from: z.coerce.number().int().min(0).nullable().optional(),
  installment_partner: z.string().trim().nullable().optional(),
  related_product_ids: z.array(z.string()).default([]),
  description_html: z.string().nullable().optional(),
  warranty_months: z.coerce.number().int().min(0).nullable().optional(),
  stock: z.coerce.number().int().min(0).nullable().optional(),
  min_stock: z.coerce.number().int().min(0).nullable().optional(),
  is_available: z.boolean().default(true),
  in_stock: z.boolean().default(true),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  condition_text: z.string().trim().nullable().optional(),
  condition_category: z.enum(["perfect", "good", "fair"]).nullable().optional(),
  battery: z.coerce.number().int().min(0).max(100).nullable().optional(),
  meta_title: z.string().trim().nullable().optional(),
  meta_description: z.string().trim().nullable().optional(),
  is_indexable: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;
export type ProductFormValues = z.input<typeof productSchema>;

/* ── Преимущества ─────────────────────────────────────────────────────── */
export const advantageSchema = z.object({
  icon: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1, "Укажите заголовок"),
  description: z.string().trim().nullable().optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_published: z.boolean().default(true),
});
export type AdvantageInput = z.infer<typeof advantageSchema>;
export type AdvantageFormValues = z.input<typeof advantageSchema>;

/* ── Hero-слайды ──────────────────────────────────────────────────────── */
export const heroSchema = z.object({
  overline: z.string().trim().nullable().optional(),
  title: z.string().trim().min(1, "Укажите заголовок"),
  description: z.string().trim().nullable().optional(),
  button_text: z.string().trim().nullable().optional(),
  button_link: z.string().trim().nullable().optional(),
  image_url: z.string().trim().nullable().optional(),
  bg_color: z.string().trim().nullable().optional(),
  theme: z.enum(["dark", "light"]).default("dark"),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_published: z.boolean().default(true),
});
export type HeroInput = z.infer<typeof heroSchema>;
export type HeroFormValues = z.input<typeof heroSchema>;

/* ── Trade-in блок (singleton) + шаги ─────────────────────────────────── */
export const tradeInBlockSchema = z.object({
  block_title: z.string().trim().min(1, "Укажите заголовок"),
  block_description: z.string().trim().nullable().optional(),
  button_text: z.string().trim().nullable().optional(),
  button_link: z.string().trim().nullable().optional(),
  image_url: z.string().trim().nullable().optional(),
  is_published: z.boolean().default(true),
});
export type TradeInBlockInput = z.infer<typeof tradeInBlockSchema>;
export type TradeInBlockFormValues = z.input<typeof tradeInBlockSchema>;

export const tradeInStepSchema = z.object({
  step_number: z.coerce.number().int().min(1).default(1),
  title: z.string().trim().min(1, "Укажите заголовок"),
  description: z.string().trim().nullable().optional(),
  icon: z.string().trim().nullable().optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
});
export type TradeInStepInput = z.infer<typeof tradeInStepSchema>;
export type TradeInStepFormValues = z.input<typeof tradeInStepSchema>;

/* ── Промокоды ────────────────────────────────────────────────────────── */
export const promoSchema = z.object({
  code: z.string().trim().min(2, "Минимум 2 символа").transform((s) => s.toUpperCase()),
  discount_type: z.enum(["percent", "fixed", "free_shipping"]).default("percent"),
  discount_value: z.coerce.number().int().min(0).default(0),
  min_order_amount: z.coerce.number().int().min(0).default(0),
  starts_at: z.string().trim().nullable().optional(),
  expires_at: z.string().trim().nullable().optional(),
  total_limit: z.coerce.number().int().min(0).nullable().optional(),
  per_customer_limit: z.coerce.number().int().min(0).nullable().optional(),
  only_new_customers: z.boolean().default(false),
  is_active: z.boolean().default(true),
});
export type PromoInput = z.infer<typeof promoSchema>;
export type PromoFormValues = z.input<typeof promoSchema>;

/* ── Статические страницы ─────────────────────────────────────────────── */
export const staticPageSchema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок"),
  slug: slugField,
  content: z.string().nullable().optional(),
  meta_title: z.string().trim().nullable().optional(),
  meta_description: z.string().trim().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});
export type StaticPageInput = z.infer<typeof staticPageSchema>;
export type StaticPageFormValues = z.input<typeof staticPageSchema>;

/* ── Bento-плитки ─────────────────────────────────────────────────────── */
export const bentoSchema = z.object({
  category_slug: z.string().trim().nullable().optional(),
  custom_title: z.string().trim().nullable().optional(),
  subtitle: z.string().trim().nullable().optional(),
  custom_image_url: z.string().trim().nullable().optional(),
  size: z.enum(["large", "medium", "small"]).default("medium"),
  theme: z.enum(["dark", "light"]).default("light"),
  sort_order: z.coerce.number().int().min(0).default(0),
  is_published: z.boolean().default(true),
});
export type BentoInput = z.infer<typeof bentoSchema>;
export type BentoFormValues = z.input<typeof bentoSchema>;

/* ── Блог ─────────────────────────────────────────────────────────────── */
export const blogCategorySchema = z.object({
  title: z.string().trim().min(1, "Укажите название"),
  slug: slugField,
  color: z.string().trim().nullable().optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
});
export type BlogCategoryInput = z.infer<typeof blogCategorySchema>;
export type BlogCategoryFormValues = z.input<typeof blogCategorySchema>;

export const blogPostSchema = z.object({
  title: z.string().trim().min(1, "Укажите заголовок"),
  slug: slugField,
  excerpt: z.string().trim().nullable().optional(),
  content: z.string().nullable().optional(),
  cover_url: z.string().trim().nullable().optional(),
  category_id: z.string().trim().nullable().optional(),
  tags: z.string().trim().nullable().optional(), // CSV в форме → text[] в БД
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  meta_title: z.string().trim().nullable().optional(),
  meta_description: z.string().trim().nullable().optional(),
});
export type BlogPostInput = z.infer<typeof blogPostSchema>;
export type BlogPostFormValues = z.input<typeof blogPostSchema>;
