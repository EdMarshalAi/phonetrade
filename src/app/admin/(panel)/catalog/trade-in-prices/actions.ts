"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";

const STAFF = ["admin", "manager"] as const;

/* ── Local schema (NOT added to shared schemas.ts) ───────────────────── */
const tradeInPriceSchema = z.object({
  model: z.string().trim().min(1, "Укажите модель"),
  base_price: z.coerce.number().int().min(0, "Цена не может быть отрицательной"),
  perfect: z.coerce.number().min(0).max(1, "Коэффициент от 0 до 1").default(1.0),
  good: z.coerce.number().min(0).max(1, "Коэффициент от 0 до 1").default(0.85),
  fair: z.coerce.number().min(0).max(1, "Коэффициент от 0 до 1").default(0.6),
  broken: z.coerce.number().min(0).max(1, "Коэффициент от 0 до 1").default(0.3),
});

type TradeInPriceInput = z.infer<typeof tradeInPriceSchema>;
export type TradeInPriceFormValues = z.input<typeof tradeInPriceSchema>;

function normalize(input: TradeInPriceInput) {
  return {
    model: input.model,
    base_price: input.base_price,
    coefficients: {
      perfect: input.perfect,
      good: input.good,
      fair: input.fair,
      broken: input.broken,
    },
    updated_at: new Date().toISOString(),
  };
}

function friendly(message: string): string {
  if (message.includes("duplicate") || message.includes("unique")) {
    return "Запись для этой модели уже существует";
  }
  return message;
}

export async function createTradeInPrice(
  input: TradeInPriceFormValues
): Promise<{ error?: string }> {
  const parsed = tradeInPriceSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "trade_in_price",
      entityId: parsed.data.model,
      changes: parsed.data,
      revalidate: ["/trade-in"],
      run: async (db) => {
        const { error } = await db.from("trade_in_prices").insert(normalize(parsed.data));
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/trade-in-prices");
}

export async function updateTradeInPrice(
  id: string,
  input: TradeInPriceFormValues
): Promise<{ error?: string }> {
  const parsed = tradeInPriceSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "trade_in_price",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/trade-in"],
      run: async (db) => {
        const { error } = await db
          .from("trade_in_prices")
          .update(normalize(parsed.data))
          .eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/trade-in-prices");
}

export async function deleteTradeInPrice(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "trade_in_price",
      entityId: id,
      revalidate: ["/trade-in"],
      run: async (db) => {
        const { error } = await db.from("trade_in_prices").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
