import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Eye } from "lucide-react";
import { getBlogPost, getRelatedBlogPosts } from "@/lib/content";
import { jsonLdScript } from "@/lib/utils/json-ld";
import { faqFromHtml, faqPageLd } from "@/lib/utils/faq-schema";
import { sanitizeRichHtml } from "@/lib/utils/sanitize-html";
import { BlogViewPing } from "@/components/blog/BlogViewPing";

// ISR: новая статья доступна без редеплоя.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return {};
  const canonical = `/blog/${slug}`;
  // Отдельная мета поста (если задана в админке) приоритетнее excerpt/заголовка.
  const title = post.meta_title?.trim() || post.title;
  const description = post.meta_description?.trim() || post.excerpt || undefined;
  const ogImage = post.og_image_url || post.cover_url || undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "article", images: ogImage ? [ogImage] : undefined },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const related = await getRelatedBlogPosts(post.category_id, slug, 3);

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru";
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_url || undefined,
    datePublished: post.published_at || undefined,
    // Реальная дата изменения (не дублируем datePublished) — сигнал свежести.
    dateModified: post.updated_at || post.published_at || undefined,
    author: { "@type": "Organization", name: "PhoneTrade", url: base },
    publisher: { "@id": `${base}/#organization` },
    mainEntityOfPage: `${base}/blog/${slug}`,
  };
  // FAQPage из блока «Частые вопросы» статьи (rich-сниппет).
  const faqLd = faqPageLd(faqFromHtml(post.content));
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: "Блог", item: `${base}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${base}/blog/${slug}` },
    ],
  };
  const blogSchemas = [articleLd, breadcrumbLd, ...(faqLd ? [faqLd] : [])];

  return (
    <article className="container-page py-16 md:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(blogSchemas) }} />
      <div className="mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Все статьи
        </Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink md:text-4xl">{post.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-[13px] text-ink-subtle">
          {post.published_at ? <span>{new Date(post.published_at).toLocaleDateString("ru-RU")}</span> : null}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" aria-hidden />
            <span className="tabular-nums">{(post.views ?? 0).toLocaleString("ru-RU")}</span>
          </span>
        </div>
        <BlogViewPing slug={slug} />
        {post.cover_url ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-surface">
            <Image src={post.cover_url} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 768px" />
          </div>
        ) : null}
        {post.content ? (
          <div
            className="prose prose-neutral mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(post.content) }}
          />
        ) : null}

        {related.length > 0 ? (
          <aside className="mt-14 border-t border-border/60 pt-8">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Похожие статьи</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/blog/${r.slug}`} className="group block overflow-hidden rounded-2xl border border-border/60 bg-white transition-shadow hover:shadow-md">
                  {r.cover_url ? (
                    <span className="relative block aspect-[16/9] overflow-hidden bg-surface">
                      <Image src={r.cover_url} alt={r.title} fill className="object-cover transition-transform group-hover:scale-[1.03]" sizes="(max-width:640px) 100vw, 33vw" />
                    </span>
                  ) : null}
                  <span className="block p-4 text-[14px] font-medium leading-snug text-ink group-hover:text-ink">{r.title}</span>
                </Link>
              ))}
            </div>
          </aside>
        ) : null}
      </div>
    </article>
  );
}
