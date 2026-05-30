"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { productSchema, type ProductInput } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";

const STAFF = ["admin", "manager", "content"] as const;

function toRow(input: ProductInput) {
  const isUsed = input.type === "used";
  return {
    title: input.title.trim(),
    slug: input.slug || null,
    sku: input.sku || null,
    category_slug: input.category_slug,
    model: input.model || "",
    color: input.color || "",
    memory: input.memory || null,
    sim: input.sim || null,
    condition: input.condition || null,
    type: input.type,
    badge: input.badge || null,
    badges: input.badges ?? [],
    options: input.options ?? {},
    short_description: input.short_description || null,
    image: input.image || "",
    price_cash: input.price_cash ?? 0,
    price_card: input.price_card ?? 0,
    price_old: input.price_old ?? null,
    installment_from: input.installment_from ?? null,
    installment_partner: input.installment_partner || null,
    related_product_ids: input.related_product_ids ?? [],
    description_html: input.description_html || null,
    warranty_months: input.warranty_months ?? null,
    stock: input.stock ?? null,
    min_stock: input.min_stock ?? null,
    is_available: input.is_available ?? true,
    in_stock: input.in_stock ?? true,
    status: input.status,
    is_used: isUsed,
    condition_text: isUsed ? input.condition_text || null : null,
    condition_category: isUsed ? input.condition_category ?? null : null,
    battery: isUsed ? input.battery ?? null : null,
    meta_title: input.meta_title || null,
    meta_description: input.meta_description || null,
    is_indexable: input.is_indexable ?? true,
    updated_at: new Date().toISOString(),
  };
}

function friendly(message: string): string {
  if (message.includes("duplicate") || message.includes("unique") || message.includes("pkey")) {
    return "Товар с таким ID/slug/SKU уже существует";
  }
  return message;
}

export async function createProduct(input: ProductInput): Promise<{ error?: string }> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };

  const slug = parsed.data.slug || slugify(parsed.data.title);
  const id = slug || `prod-${crypto.randomUUID().slice(0, 8)}`;

  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "product",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/", `/category/${parsed.data.category_slug}`, `/product/${id}`],
      run: async (db) => {
        const row = toRow({ ...parsed.data, slug });
        const { error } = await db.from("products").insert({
          id,
          ...row,
          published_at: row.status === "published" ? new Date().toISOString() : null,
        });
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/products");
}

export async function updateProduct(id: string, input: ProductInput): Promise<{ error?: string }> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "product",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/", `/category/${parsed.data.category_slug}`, `/product/${id}`],
      run: async (db) => {
        const { error } = await db.from("products").update(toRow(parsed.data)).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/products");
}

/** Soft-delete: помечаем deleted_at + архивируем (товар исчезает с сайта, но восстановим). */
export async function deleteProduct(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "product",
      entityId: id,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db
          .from("products")
          .update({ deleted_at: new Date().toISOString(), status: "archived", updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
