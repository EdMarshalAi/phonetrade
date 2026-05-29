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

// ── Images ─────────────────────────────────────────────────────────────────

export async function addProductImage(
  productId: string,
  url: string,
  alt?: string
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
        // Count existing to determine sort_order and whether this is first (primary)
        const { count } = await db
          .from("product_images")
          .select("id", { count: "exact", head: true })
          .eq("product_id", productId);
        const isFirst = (count ?? 0) === 0;
        const { error } = await db.from("product_images").insert({
          product_id: productId,
          url,
          alt: alt || null,
          sort_order: count ?? 0,
          is_primary: isFirst,
        });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка добавления изображения" };
  }
}

export async function deleteProductImage(
  id: string,
  productId: string
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "product_image",
      entityId: id,
      revalidate: ["/", `/product/${productId}`],
      run: async (db) => {
        const { error } = await db.from("product_images").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления изображения" };
  }
}

export async function setPrimaryImage(
  productId: string,
  id: string
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "product_image",
      entityId: id,
      changes: { is_primary: true },
      revalidate: ["/", `/product/${productId}`],
      run: async (db) => {
        // Clear primary on all images for this product, then set on target
        const { error: e1 } = await db
          .from("product_images")
          .update({ is_primary: false })
          .eq("product_id", productId);
        if (e1) throw e1;
        const { error: e2 } = await db
          .from("product_images")
          .update({ is_primary: true })
          .eq("id", id);
        if (e2) throw e2;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка установки главного изображения" };
  }
}
