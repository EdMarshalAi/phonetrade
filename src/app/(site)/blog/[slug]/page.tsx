import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getBlogPost } from "@/lib/content";

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
  return { title: post.title, description: post.excerpt || undefined };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  return (
    <article className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Все статьи
        </Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink md:text-4xl">{post.title}</h1>
        {post.published_at ? (
          <p className="mt-2 text-[13px] text-ink-subtle">{new Date(post.published_at).toLocaleDateString("ru-RU")}</p>
        ) : null}
        {post.cover_url ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl bg-surface">
            <Image src={post.cover_url} alt={post.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 768px" />
          </div>
        ) : null}
        {post.content ? (
          <div
            className="prose prose-neutral mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : null}
      </div>
    </article>
  );
}
