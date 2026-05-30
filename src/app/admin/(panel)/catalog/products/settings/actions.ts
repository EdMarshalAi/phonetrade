"use server";

import { adminMutation } from "@/lib/admin/mutations";
import type { ProductOption, ProductBadge, InfoBlock, CardDisplay } from "@/lib/content";

const STAFF = ["admin", "manager", "content"] as const;

/** Сохраняет реестр опций, бейджей и блоков под товаром (shop_settings). */
export async function saveProductRegistry(
  options: ProductOption[],
  badges: ProductBadge[],
  productBlocks: InfoBlock[] = [],
  allowZeroStock = true,
  cardDisplay?: CardDisplay
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "settings_change",
      entityType: "settings",
      entityId: "product_registry",
      changes: { options: options.length, badges: badges.length },
      revalidate: ["/", "/admin/catalog/products"],
      run: async (db) => {
        const normOptions = options.map((o, i) => ({
          key: o.key,
          label: o.label.trim(),
          field: o.field ?? null,
          values: o.values.map((v) => v.trim()).filter(Boolean),
          sort: i,
          applies_to: o.applies_to ?? "both",
        }));
        const normBadges = badges.map((b, i) => ({
          key: b.key,
          label: b.label.trim(),
          bg: b.bg || "#1d1d1f",
          fg: b.fg || "#ffffff",
          icon: b.icon ?? null,
          tooltip: (b.tooltip ?? "").trim(),
          sort: i,
          position: b.position ?? "tl",
        }));
        const normBlocks = productBlocks.map((b) => ({
          icon: b.icon ?? null,
          title: b.title.trim(),
          text: b.text.trim(),
          ...(b.href ? { href: b.href.trim() } : {}),
        }));
        const { error: e1 } = await db
          .from("shop_settings")
          .upsert({ key: "product_options", value: normOptions }, { onConflict: "key" });
        if (e1) throw e1;
        const { error: e2 } = await db
          .from("shop_settings")
          .upsert({ key: "product_badges", value: normBadges }, { onConflict: "key" });
        if (e2) throw e2;
        const { error: e3 } = await db
          .from("shop_settings")
          .upsert({ key: "product_blocks", value: normBlocks }, { onConflict: "key" });
        if (e3) throw e3;
        const { error: e4 } = await db
          .from("shop_settings")
          .upsert({ key: "product_availability", value: { allow_zero_stock: allowZeroStock } }, { onConflict: "key" });
        if (e4) throw e4;
        if (cardDisplay) {
          const { error: e5 } = await db
            .from("shop_settings")
            .upsert({ key: "card_display", value: cardDisplay }, { onConflict: "key" });
          if (e5) throw e5;
        }
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения настроек" };
  }
}
