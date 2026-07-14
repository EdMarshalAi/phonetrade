import type { MetadataRoute } from "next";
import { getCategories, getProductCountsByCategory, getSitemapProducts } from "@/lib/products";
import { getPublishedPageSlugs, getBlogPosts } from "@/lib/content";

export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");

function abs(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, pages, posts, categoryCounts] = await Promise.all([
    getCategories(),
    getSitemapProducts(),
    getPublishedPageSlugs(),
    getBlogPosts(),
    getProductCountsByCategory(),
  ]);

  // У статики и категорий нет надёжной «даты изменения» — НЕ ставим lastModified,
  // иначе при ISR (revalidate=3600) ложная дата будет обновляться каждый час.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: abs("/"), changeFrequency: "daily", priority: 1 },
    { url: abs("/catalog"), changeFrequency: "daily", priority: 0.9 },
    { url: abs("/new"), changeFrequency: "daily", priority: 0.8 },
    { url: abs("/used"), changeFrequency: "daily", priority: 0.7 },
    { url: abs("/trade-in"), changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/repair"), changeFrequency: "monthly", priority: 0.7 },
    { url: abs("/blog"), changeFrequency: "weekly", priority: 0.6 },
  ];

  const sitemapCategories = categories.filter((category) => {
    // Дублирующая коллекция имеет постоянный redirect на единственный URL /used.
    if (String(category.slug) === "iphone-used") return false;
    // Любая ошибка счётчика завершает генерацию sitemap выше. Поэтому пустой
    // объект здесь означает реально пустой каталог, а не частичный ответ БД.
    const childCount = categories
      .filter((child) => child.parentSlug === category.slug)
      .reduce((sum, child) => sum + (categoryCounts[child.slug] ?? 0), 0);
    return (categoryCounts[category.slug] ?? 0) + childCount > 0;
  });

  const categoryRoutes: MetadataRoute.Sitemap = sitemapCategories.map((c) => ({
    url: abs(`/category/${c.slug}`),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: abs(`/product/${p.id}`),
    changeFrequency: "weekly",
    priority: 0.7,
    // Google Image: главное фото товара (Storage-URL уже абсолютный).
    ...(p.image ? { images: [p.image] } : {}),
  }));

  const pageRoutes: MetadataRoute.Sitemap = pages.map((p) => ({
    url: abs(`/${p.slug}`),
    ...(p.updatedAt ? { lastModified: new Date(p.updatedAt) } : {}),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => {
    const lastModified = p.updated_at ?? p.published_at;
    return {
      url: abs(`/blog/${p.slug}`),
      ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
      changeFrequency: "monthly",
      priority: 0.5,
    };
  });

  // Дедуп по URL (первая запись выигрывает) — защита от пересечения хардкод-роутов
  // и опубликованных static_pages (напр. /trade-in существует и там, и там).
  const all = [...staticRoutes, ...categoryRoutes, ...productRoutes, ...pageRoutes, ...blogRoutes];
  const seen = new Set<string>();
  return all.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
}
