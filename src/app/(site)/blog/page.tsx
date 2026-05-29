import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getBlogPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Блог",
  description: "Статьи о технике Apple, новинках и советах от PhoneTrade.",
};

export default async function BlogIndexPage() {
  const posts = await getBlogPosts();

  return (
    <div className="container-page py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">Блог</h1>
        <p className="mt-3 text-ink-muted">Новинки, обзоры и советы по технике Apple.</p>

        {posts.length === 0 ? (
          <p className="mt-12 text-ink-subtle">Пока нет опубликованных статей.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/blog/${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-border/60 bg-white transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
              >
                <div className="relative aspect-[16/10] bg-surface">
                  {p.cover_url ? (
                    <Image src={p.cover_url} alt={p.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
                  ) : null}
                </div>
                <div className="p-5">
                  <h2 className="text-[17px] font-semibold tracking-tight text-ink group-hover:underline">{p.title}</h2>
                  {p.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{p.excerpt}</p> : null}
                  {p.published_at ? (
                    <p className="mt-3 text-[12px] text-ink-subtle">{new Date(p.published_at).toLocaleDateString("ru-RU")}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
