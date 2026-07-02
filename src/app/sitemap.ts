import type { MetadataRoute } from "next";
import { getCategories, getSitemapProducts } from "@/lib/products";
import { getPublishedPageSlugs, getBlogPosts } from "@/lib/content";

export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");

function abs(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, pages, posts] = await Promise.all([
    getCategories().catch(() => []),
    getSitemapProducts().catch(() => []),
    getPublishedPageSlugs().catch(() => []),
    getBlogPosts().catch(() => []),
  ]);

  const now = new Date();

  // У статики и категорий нет надёжной «даты изменения» — НЕ ставим lastModified,
  // иначе при ISR (revalidate=3600) она каждый час = now → ложный сигнал «весь сайт переписан».
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: abs("/"), changeFrequency: "daily", priority: 1 },
    { url: abs("/catalog"), changeFrequency: "daily", priority: 0.9 },
    { url: abs("/new"), changeFrequency: "daily", priority: 0.8 },
    { url: abs("/used"), changeFrequency: "daily", priority: 0.7 },
    { url: abs("/repair"), changeFrequency: "monthly", priority: 0.7 },
    { url: abs("/blog"), changeFrequency: "weekly", priority: 0.6 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: abs(`/category/${c.slug}`),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: abs(`/product/${p.id}`),
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
    // Google Image: главное фото товара (Storage-URL уже абсолютный).
    ...(p.image ? { images: [p.image] } : {}),
  }));

  const pageRoutes: MetadataRoute.Sitemap = pages.map((p) => ({
    url: abs(`/${p.slug}`),
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: abs(`/blog/${p.slug}`),
    lastModified: p.published_at ? new Date(p.published_at) : now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // Дедуп по URL (первая запись выигрывает) — защита от пересечения хардкод-роутов
  // и опубликованных static_pages (напр. /trade-in существует и там, и там).
  const all = [...staticRoutes, ...categoryRoutes, ...productRoutes, ...pageRoutes, ...blogRoutes];
  const seen = new Set<string>();
  return all.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
}
