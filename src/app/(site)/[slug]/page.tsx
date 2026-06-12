import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStaticPage } from "@/lib/content";
import { sanitizeRichHtml } from "@/lib/utils/sanitize-html";
import { jsonLdScript } from "@/lib/utils/json-ld";
import { faqFromHtml, faqPageLd } from "@/lib/utils/faq-schema";

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
  // meta_title часто уже содержит бренд → absolute, чтобы не было «… | PhoneTrade · PhoneTrade».
  return {
    title: page.meta_title?.trim() ? { absolute: page.meta_title.trim() } : page.title,
    description: page.meta_description || undefined,
    alternates: { canonical: `/${slug}` },
    openGraph: { url: `/${slug}`, title: page.meta_title?.trim() || page.title },
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

  // Контент может задать собственный заголовок (внутри вёрстки) — тогда
  // автоматический h1 не выводим (маркер <!--hide-title-->).
  const hideTitle = page.content?.includes("<!--hide-title-->") ?? false;

  // JSON-LD: хлебные крошки + FAQPage (если в контенте есть «Частые вопросы»).
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: page.title, item: `${base}/${slug}` },
    ],
  };
  const faqLd = faqPageLd(faqFromHtml(page.content));
  const schemas = [breadcrumbLd, ...(faqLd ? [faqLd] : [])];

  return (
    <article className="container-page py-16 md:py-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(schemas) }} />
      <div className="w-full">
        {!hideTitle && <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">{page.title}</h1>}
        {page.content ? (
          <div
            className="prose prose-neutral mt-8 w-full max-w-none prose-headings:tracking-tight prose-img:rounded-2xl prose-img:max-w-3xl prose-table:w-full [&_details]:my-3 [&_details]:rounded-2xl [&_details]:border [&_details]:border-border/60 [&_details]:bg-white [&_details]:px-5 [&_summary]:flex [&_summary]:cursor-pointer [&_summary]:list-none [&_summary]:items-center [&_summary]:gap-3 [&_summary]:py-4 [&_summary]:font-semibold [&_summary]:text-ink [&_summary::-webkit-details-marker]:hidden [&_summary]:after:ml-auto [&_summary]:after:text-2xl [&_summary]:after:font-normal [&_summary]:after:leading-none [&_summary]:after:text-ink-muted [&_summary]:after:content-['+'] [&_details[open]_summary]:after:content-['−'] [&_details>*:last-child]:pb-5"
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(page.content) }}
          />
        ) : null}
      </div>
    </article>
  );
}
