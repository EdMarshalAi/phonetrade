"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { slugify } from "@/lib/admin/slug";

export type AdminBucket =
  | "product-images"
  | "hero-slides"
  | "blog-covers"
  | "bento-tiles"
  | "brand-logos"
  | "og-images"
  | "general";

export interface UploadResult {
  url?: string;
  path?: string;
  error?: string;
}

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/avif", "image/gif"];

/**
 * Загружает изображение в Supabase Storage (service-role) и возвращает
 * публичный URL. Имя файла нормализуется + добавляется случайный суффикс
 * из crypto, чтобы избежать коллизий.
 */
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  await requireAdmin();

  const file = formData.get("file");
  const bucket = (formData.get("bucket") as AdminBucket) || "general";
  const folder = (formData.get("folder") as string) || "";

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Файл не выбран" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Файл больше 8 МБ" };
  }
  if (!ALLOWED.includes(file.type)) {
    return { error: "Допустимы только изображения (png, jpg, webp, svg, avif, gif)" };
  }

  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "bin";
  const base = slugify(dot >= 0 ? file.name.slice(0, dot) : file.name) || "image";
  const rand = crypto.randomUUID().slice(0, 8);
  const path = `${folder ? folder.replace(/^\/|\/$/g, "") + "/" : ""}${base}-${rand}.${ext}`;

  const db = createSupabaseAdminClient();
  const { error } = await db.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
