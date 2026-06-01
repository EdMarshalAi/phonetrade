"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { slugify } from "@/lib/admin/slug";
import { assertPublicHost } from "@/lib/utils/ssrf";

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

/** Разрешённые типы для импорта по прямой ссылке (строже, чем при загрузке файла). */
const URL_ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Импортирует изображение по прямой ссылке в Storage и возвращает публичный URL.
 * Безопасность: только http(s); тип проверяется по реальному Content-Type ответа
 * (PNG/JPG/WebP); лимит 8 МБ; таймаут 10 с. «Что попало» не пройдёт.
 */
export async function uploadImageFromUrl(
  rawUrl: string,
  bucket: AdminBucket = "general",
  folder = ""
): Promise<UploadResult> {
  await requireAdmin();

  let parsed: URL;
  try {
    parsed = new URL((rawUrl || "").trim());
  } catch {
    return { error: "Некорректная ссылка" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Ссылка должна начинаться с http:// или https://" };
  }
  // SSRF: запрет внутренних/служебных адресов (loopback, private, 169.254.169.254 и т.п.).
  const ssrf = await assertPublicHost(parsed.hostname);
  if (ssrf) return { error: ssrf };

  let resp: Response;
  try {
    resp = await fetch(parsed.toString(), { redirect: "follow", signal: AbortSignal.timeout(10000) });
  } catch {
    return { error: "Не удалось загрузить файл по ссылке" };
  }
  if (!resp.ok) return { error: `Файл недоступен по ссылке (HTTP ${resp.status})` };

  const contentType = (resp.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = URL_ALLOWED[contentType];
  if (!ext) {
    return { error: "Можно загрузить только изображение PNG, JPG или WebP" };
  }

  const buf = await resp.arrayBuffer();
  if (buf.byteLength === 0) return { error: "Файл по ссылке пустой" };
  if (buf.byteLength > MAX_BYTES) return { error: "Файл больше 8 МБ" };

  const rawName = parsed.pathname.split("/").pop()?.replace(/\.[^.]+$/, "") || "image";
  const base = slugify(rawName) || "image";
  const rand = crypto.randomUUID().slice(0, 8);
  const path = `${folder ? folder.replace(/^\/|\/$/g, "") + "/" : ""}${base}-${rand}.${ext}`;

  const db = createSupabaseAdminClient();
  const { error } = await db.storage.from(bucket).upload(path, new Uint8Array(buf), {
    contentType,
    upsert: false,
  });
  if (error) return { error: error.message };

  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
