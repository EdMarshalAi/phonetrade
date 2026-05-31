import type { MetadataRoute } from "next";
import { getCategories, getSitemapProducts } from "@/lib/products";
import { getPublishedPageSlugs, getBlogPosts } from "@/lib/content";

export const revalidate = 3600;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://31.129.97.8").replace(/\/$/, "");

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

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs("/catalog"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: abs("/new"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: abs("/used"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: abs("/trade-in"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: abs(`/category/${c.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: abs(`/product/${p.id}`),
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.7,
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

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...pageRoutes, ...blogRoutes];
}
