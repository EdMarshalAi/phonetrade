"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import {
  tradeInBlockSchema,
  tradeInStepSchema,
  type TradeInBlockInput,
  type TradeInStepInput,
} from "@/lib/admin/schemas";

const CONTENT = ["admin", "content"] as const;

/** Singleton-блок: обновляем существующий или создаём первый. */
export async function saveTradeInBlock(id: string | null, input: TradeInBlockInput): Promise<{ error?: string }> {
  const parsed = tradeInBlockSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  const row = {
    block_title: parsed.data.block_title.trim(),
    block_description: parsed.data.block_description || null,
    button_text: parsed.data.button_text || null,
    button_link: parsed.data.button_link || null,
    image_url: parsed.data.image_url || null,
    is_published: parsed.data.is_published ?? true,
  };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "update",
      entityType: "trade_in_block",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = id
          ? await db.from("trade_in_block").update(row).eq("id", id)
          : await db.from("trade_in_block").insert(row);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}

function stepRow(input: TradeInStepInput) {
  return {
    step_number: input.step_number ?? 1,
    title: input.title.trim(),
    description: input.description || null,
    icon: input.icon || null,
    sort_order: input.sort_order ?? 0,
  };
}

export async function createStep(input: TradeInStepInput): Promise<{ error?: string }> {
  const parsed = tradeInStepSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "create",
      entityType: "trade_in_step",
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("trade_in_steps").insert(stepRow(parsed.data));
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/content/home-blocks?tab=trade-in");
}

export async function updateStep(id: string, input: TradeInStepInput): Promise<{ error?: string }> {
  const parsed = tradeInStepSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте поля" };
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "update",
      entityType: "trade_in_step",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("trade_in_steps").update(stepRow(parsed.data)).eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
  redirect("/admin/content/home-blocks?tab=trade-in");
}

export async function deleteStep(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...CONTENT],
      action: "delete",
      entityType: "trade_in_step",
      entityId: id,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db.from("trade_in_steps").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
