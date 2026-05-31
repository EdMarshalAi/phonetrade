import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStaticPage } from "@/lib/content";

/**
 * Публичная статическая страница из админки (/about, /delivery, /warranty…).
 * Динамический сегмент верхнего уровня — конкретные маршруты (cart, blog,
 * category, product, account, auth) имеют приоритет. Нет страницы → 404.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getStaticPage(slug);
  if (!page) return {};
  return {
    title: page.meta_title || page.title,
    description: page.meta_description || undefined,
  };
}

export default async function StaticPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getStaticPage(slug);
  if (!page) notFound();

  return (
    <article className="container-page py-16 md:py-24">
      <div className="w-full">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">{page.title}</h1>
        {page.content ? (
          <div
            className="prose prose-neutral mt-8 w-full max-w-none prose-headings:tracking-tight prose-img:rounded-2xl prose-img:max-w-3xl prose-table:w-full"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        ) : null}
      </div>
    </article>
  );
}
