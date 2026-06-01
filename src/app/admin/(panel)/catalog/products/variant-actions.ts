"use server";

import { adminMutation } from "@/lib/admin/mutations";

const STAFF = ["admin", "manager", "content"] as const;

// ── Types ──────────────────────────────────────────────────────────────────

export interface VariantInput {
  memory?: string;
  color?: string;
  color_hex?: string;
  sku?: string;
  price_cash?: number;
  price_card?: number;
  stock?: number;
  image_url?: string;
  sort_order?: number;
}

// ── Variants ───────────────────────────────────────────────────────────────

export async function createVariant(
  productId: string,
  input: VariantInput
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "product_variant",
      entityId: productId,
      changes: input,
      revalidate: ["/", `/product/${productId}`],
      run: async (db) => {
        const { error } = await db.from("product_variants").insert({
          product_id: productId,
          memory: input.memory || null,
          color: input.color || null,
          color_hex: input.color_hex || null,
          sku: input.sku || null,
          price_cash: input.price_cash ?? 0,
          price_card: input.price_card ?? 0,
          stock: input.stock ?? 0,
          image_url: input.image_url || null,
          sort_order: input.sort_order ?? 0,
        });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка создания варианта" };
  }
}

export async function updateVariant(
  id: string,
  productId: string,
  input: VariantInput
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "product_variant",
      entityId: id,
      changes: input,
      revalidate: ["/", `/product/${productId}`],
      run: async (db) => {
        const { error } = await db
          .from("product_variants")
          .update({
            memory: input.memory || null,
            color: input.color || null,
            color_hex: input.color_hex || null,
            sku: input.sku || null,
            price_cash: input.price_cash ?? 0,
            price_card: input.price_card ?? 0,
            stock: input.stock ?? 0,
            image_url: input.image_url || null,
            sort_order: input.sort_order ?? 0,
          })
          .eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка обновления варианта" };
  }
}

export async function deleteVariant(
  id: string,
  productId: string
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "product_variant",
      entityId: id,
      revalidate: ["/", `/product/${productId}`],
      run: async (db) => {
        const { error } = await db.from("product_variants").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления варианта" };
  }
}

// ── Изображения товара ───────────────────────────────────────────────────────
// Единый источник правды для фото — колонки products.image (главное) и
// products.gallery (доп. фото, jsonb-массив URL). Витрина показывает
// dedupe([image, ...gallery]); админка управляет тем же набором, поэтому
// в админке и на сайте всегда одинаковые фотографии.

async function readImages(
  db: Awaited<ReturnType<typeof import("@/lib/supabase/admin").createSupabaseAdminClient>>,
  productId: string
): Promise<{ image: string | null; gallery: string[] }> {
  const { data, error } = await db
    .from("products")
    .select("image,gallery")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  const gallery = Array.isArray(data?.gallery) ? (data!.gallery as string[]) : [];
  return { image: (data?.image as string | null) ?? null, gallery };
}

/** Добавить фото: если главного нет — становится главным, иначе уходит в галерею. */
export async function addProductImage(
  productId: string,
  url: string
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "product_image",
      entityId: productId,
      changes: { url },
      revalidate: ["/", `/product/${productId}`],
      run: async (db) => {
        const { image, gallery } = await readImages(db, productId);
        const patch =
          !image
            ? { image: url }
            : url === image || gallery.includes(url)
              ? null // уже есть — ничего не делаем
              : { gallery: [...gallery, url] };
        if (!patch) return;
        const { error } = await db.from("products").update(patch).eq("id", productId);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка добавления изображения" };
  }
}

/** Удалить фото по URL. Удаление главного повышает первое из галереи. */
export async function deleteProductImage(
  url: string,
  productId: string
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "product_image",
      entityId: productId,
      changes: { url },
      revalidate: ["/", `/product/${productId}`],
      run: async (db) => {
        const { image, gallery } = await readImages(db, productId);
        const rest = Array.from(new Set(gallery)).filter((g) => g && g !== url);
        const patch =
          url === image
            ? { image: rest[0] ?? "", gallery: rest.slice(1) }
            : { image, gallery: rest.filter((g) => g !== image) };
        const { error } = await db.from("products").update(patch).eq("id", productId);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления изображения" };
  }
}

/** Сделать фото главным: бывшее главное уходит в галерею. */
export async function setPrimaryImage(
  productId: string,
  url: string
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "product_image",
      entityId: productId,
      changes: { primary: url },
      revalidate: ["/", `/product/${productId}`],
      run: async (db) => {
        const { image, gallery } = await readImages(db, productId);
        if (url === image) return;
        // Дедуп + новое главное не остаётся в галерее (gallery — БЕЗ главного).
        const nextGallery = Array.from(
          new Set([...(image ? [image] : []), ...gallery])
        ).filter((g) => g && g !== url);
        const { error } = await db
          .from("products")
          .update({ image: url, gallery: nextGallery })
          .eq("id", productId);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка установки главного изображения" };
  }
}

// ── Связанные товары (группа вариантов: цвет/память) ─────────────────────────

/**
 * Присваивает общую группу variant_group_id товару и выбранным связанным
 * товарам (двунаправленно). Товары, которые были в группе, но не выбраны —
 * исключаются. Если в группе остаётся ≤1 товара — группа снимается у всех.
 * Витрина показывает переключатели цвет/память по этой группе (фолбэк — model).
 */
export async function setVariantGroup(
  productId: string,
  memberIds: string[]
): Promise<{ error?: string; group?: string | null; count?: number }> {
  const allIds = Array.from(new Set([productId, ...memberIds.filter(Boolean)]));
  try {
    let group: string | null = null;
    let count = 0;
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "variant_group",
      entityId: productId,
      changes: { members: allIds.length },
      revalidate: ["/", "/catalog", ...allIds.map((id) => `/product/${id}`)],
      run: async (db) => {
        const now = new Date().toISOString();
        const { data: cur } = await db.from("products").select("variant_group_id").eq("id", productId).maybeSingle();
        const existing = (cur?.variant_group_id as string | null) ?? null;

        if (allIds.length <= 1) {
          if (existing) {
            const { error } = await db.from("products").update({ variant_group_id: null, updated_at: now }).eq("variant_group_id", existing);
            if (error) throw error;
          }
          group = null;
          return;
        }

        const groupId = existing ?? `vg-${crypto.randomUUID().slice(0, 12)}`;
        // снять группу с тех, кто был в ней, но больше не выбран
        if (existing) {
          const { data: prev } = await db.from("products").select("id").eq("variant_group_id", existing);
          const toRemove = (prev ?? []).map((p) => p.id as string).filter((id) => !allIds.includes(id));
          if (toRemove.length) {
            const { error } = await db.from("products").update({ variant_group_id: null, updated_at: now }).in("id", toRemove);
            if (error) throw error;
          }
        }
        const { error } = await db.from("products").update({ variant_group_id: groupId, updated_at: now }).in("id", allIds);
        if (error) throw error;
        group = groupId;
        count = allIds.length;
      },
    });
    return { group, count };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения группы" };
  }
}
