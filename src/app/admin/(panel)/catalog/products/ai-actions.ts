"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { generateProductCopy as gen, type AiKind, type AiContext, type AiResult } from "@/lib/admin/openai";

/** Генерация текста карточки товара через ChatGPT (краткое/полное описание, мета). */
export async function generateProductCopy(kind: AiKind, ctx: AiContext): Promise<AiResult> {
  await requireAdmin(["admin", "manager", "content"]);
  return gen(kind, ctx);
}
