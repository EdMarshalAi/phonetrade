"use server";

import { adminMutation } from "@/lib/admin/mutations";
import type { CartSettings, InfoBlock } from "@/lib/content";

const STAFF = ["admin"] as const;

/** Сохраняет настройки корзины: оплата, доставка и блоки под кнопкой заказа. */
export async function saveCartSettings(
  settings: CartSettings,
  checkoutBlocks: InfoBlock[]
): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "settings_change",
      entityType: "settings",
      entityId: "cart",
      changes: { payments: settings.payments.length, delivery: settings.delivery.length, blocks: checkoutBlocks.length },
      revalidate: ["/", "/cart"],
      run: async (db) => {
        const cart = {
          payments: settings.payments.map((p) => ({
            key: p.key,
            enabled: !!p.enabled,
            label: p.label.trim(),
            note: (p.note ?? "").trim(),
          })),
          delivery: settings.delivery.map((d) => ({
            key: d.key,
            enabled: !!d.enabled,
            label: d.label.trim(),
            note: (d.note ?? "").trim(),
            price: Math.max(0, Math.round(Number(d.price) || 0)),
            freeFrom: Math.max(0, Math.round(Number(d.freeFrom) || 0)),
          })),
        };
        const blocks = checkoutBlocks.map((b) => ({
          icon: b.icon ?? null,
          title: b.title.trim(),
          text: b.text.trim(),
        }));
        const { error: e1 } = await db.from("shop_settings").upsert({ key: "cart", value: cart }, { onConflict: "key" });
        if (e1) throw e1;
        const { error: e2 } = await db.from("shop_settings").upsert({ key: "checkout_blocks", value: blocks }, { onConflict: "key" });
        if (e2) throw e2;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
