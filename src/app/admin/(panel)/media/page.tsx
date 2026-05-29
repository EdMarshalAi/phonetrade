import type { Metadata } from "next";
import Image from "next/image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/admin/ui";
import { EmptyState } from "@/components/admin/table";
import { FilterSelect } from "@/components/admin/ListControls";
import { MediaUploader, CopyUrlButton } from "./MediaTools";
import type { AdminBucket } from "@/lib/admin/upload-actions";

export const metadata: Metadata = { title: "Медиа-библиотека" };

const BUCKETS: AdminBucket[] = ["product-images", "hero-slides", "blog-covers", "bento-tiles", "brand-logos", "og-images", "general"];

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const bucket = (BUCKETS.includes(sp.bucket as AdminBucket) ? sp.bucket : "product-images") as AdminBucket;
  const db = createSupabaseAdminClient();
  const { data } = await db.storage.from(bucket).list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });

  const files = (data ?? []).filter((f) => f.id !== null);
  const items = files.map((f) => ({ name: f.name, url: db.storage.from(bucket).getPublicUrl(f.name).data.publicUrl }));

  return (
    <>
      <PageHeader
        title="Медиа-библиотека"
        description="Файлы Supabase Storage по бакетам."
        actions={<MediaUploader bucket={bucket} />}
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect param="bucket" allLabel="product-images" options={BUCKETS.map((b) => ({ value: b, label: b }))} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="В этом бакете пусто" hint="Загрузите изображение кнопкой выше." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((it) => (
            <div key={it.name} className="group overflow-hidden rounded-md border border-border/70 bg-white">
              <div className="relative aspect-square bg-surface">
                <Image src={it.url} alt={it.name} fill className="object-contain p-2" sizes="200px" />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2.5 py-2">
                <span className="truncate text-[12px] text-ink-muted" title={it.name}>{it.name}</span>
                <CopyUrlButton url={it.url} />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
