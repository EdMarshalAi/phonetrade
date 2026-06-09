import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Eye } from "lucide-react";
import { getBlogPost } from "@/lib/content";
import { jsonLdScript } from "@/lib/utils/json-ld";
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
  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: { canonical },
    openGraph: { title: post.title, description: post.excerpt || undefined, url: canonical, type: "article", images: post.cover_url ? [post.cover_url] : undefined },
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

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru";
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.cover_url || undefined,
    datePublished: post.published_at || undefined,
    dateModified: post.published_at || undefined,
    author: { "@type": "Organization", name: "PhoneTrade" },
    publisher: { "@id": `${base}/#organization` },
    mainEntityOfPage: `${base}/blog/${slug}`,
  };

  return (
    <article className="container-page py-16 md:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(articleLd) }} />
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
      </div>
    </article>
  );
}
