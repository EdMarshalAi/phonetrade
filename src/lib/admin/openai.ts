import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Генерация текстов карточки товара через ChatGPT (OpenAI).
 * Ключ, модель и системные промты хранятся в integrations(key='openai').
 * Системный промт редактируется владельцем (SEO-настройка), а формат ответа
 * (строгий JSON) и жёсткие запреты (без цены, без выдумок) добавляются здесь —
 * чтобы ответ всегда парсился, как бы ни был изменён промт.
 */

export type AiKind = "short" | "full" | "meta";

export interface AiContext {
  title: string;
  category?: string;
  color?: string;
  memory?: string;
  sim?: string;
  model?: string;
  type?: string; // new | used
}

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

/** Дефолтные системные промты (SEO под Белгород, без цены, без выдуманных фактов). */
export const DEFAULT_AI_PROMPTS: Record<AiKind, string> = {
  short:
    "Ты — SEO-копирайтер интернет-магазина техники в Белгороде. Пиши на русском, по делу и без воды. " +
    "Составь КРАТКОЕ описание товара (1–2 предложения, до 300 знаков) для карточки в списке. " +
    "Опиши реальные характеристики и пользу товара «{{title}}» — без выдуманных фактов и спецификаций. " +
    "Естественно вплети локальные ключи (купить в Белгороде, доставка, гарантия, самовывоз) без переспама. " +
    "СТРОГО запрещено: указывать цену, любые суммы, скидки, проценты и упоминать конкурентов.",
  full:
    "Ты — SEO-копирайтер интернет-магазина техники в Белгороде. Пиши на русском, структурно и полезно для покупателя. " +
    "Составь ПОДРОБНОЕ описание товара «{{title}}» в виде чистого HTML: заголовок <h2>, абзацы <p>, " +
    "маркированный список <ul><li> ключевых особенностей. Опиши реальные возможности, материалы и преимущества модели — " +
    "без выдуманных характеристик, которых нет у товара. Естественное локальное SEO (Белгород, доставка, гарантия, самовывоз) без переспама. " +
    "СТРОГО запрещено: указывать цену, любые суммы, скидки, проценты, рассрочку и упоминать конкурентов.",
  meta:
    "Ты — SEO-специалист интернет-магазина техники в Белгороде. Составь SEO meta_title (до 60 знаков) и " +
    "meta_description (до 160 знаков) для страницы товара «{{title}}». В title — название товара и «купить в Белгороде». " +
    "В description — суть товара и выгоды (доставка, гарантия, самовывоз) с лёгким призывом. Только реальные факты, без выдумок. " +
    "СТРОГО запрещено: указывать цену, любые суммы, скидки, проценты и упоминать конкурентов.",
};

function fillVars(template: string, ctx: AiContext): string {
  return template
    .replace(/\{\{\s*title\s*\}\}/gi, ctx.title || "")
    .replace(/\{\{\s*category\s*\}\}/gi, ctx.category || "")
    .replace(/\{\{\s*color\s*\}\}/gi, ctx.color || "")
    .replace(/\{\{\s*memory\s*\}\}/gi, ctx.memory || "")
    .replace(/\{\{\s*sim\s*\}\}/gi, ctx.sim || "")
    .replace(/\{\{\s*model\s*\}\}/gi, ctx.model || "");
}

function contextLines(ctx: AiContext): string {
  const lines = [`Товар: ${ctx.title}`];
  if (ctx.category) lines.push(`Категория: ${ctx.category}`);
  if (ctx.model) lines.push(`Модель: ${ctx.model}`);
  if (ctx.color) lines.push(`Цвет: ${ctx.color}`);
  if (ctx.memory) lines.push(`Память: ${ctx.memory}`);
  if (ctx.sim) lines.push(`SIM: ${ctx.sim}`);
  if (ctx.type === "used") lines.push("Состояние: Б/У (бывший в употреблении)");
  return lines.join("\n");
}

/** Требование к формату ответа (JSON) — добавляется к запросу, не зависит от промта. */
const JSON_SPEC: Record<AiKind, string> = {
  short: 'Верни СТРОГО JSON: {"short_description": "..."}',
  full: 'Верни СТРОГО JSON: {"description_html": "<h2>...</h2><p>...</p>..."}',
  meta: 'Верни СТРОГО JSON: {"meta_title": "...", "meta_description": "..."}',
};

export type AiResult =
  | { short_description: string }
  | { description_html: string }
  | { meta_title: string; meta_description: string }
  | { error: string };

export async function generateProductCopy(kind: AiKind, ctx: AiContext): Promise<AiResult> {
  if (!ctx.title?.trim()) return { error: "Сначала укажите название товара" };
  const db = createSupabaseAdminClient();
  const { data } = await db.from("integrations").select("config,is_enabled").eq("key", "openai").maybeSingle();
  if (!data || data.is_enabled === false) return { error: "Интеграция ChatGPT выключена — включите её в Настройки → Интеграции." };
  const config = (data.config ?? {}) as Record<string, string>;
  const apiKey = (config.api_key || "").trim();
  if (!apiKey) return { error: "Не задан API-ключ ChatGPT (Настройки → Интеграции → ChatGPT)." };
  const model = (config.model || "gpt-4o-mini").trim();
  const sysTemplate = (config[`prompt_${kind}`] || "").trim() || DEFAULT_AI_PROMPTS[kind];

  const system = fillVars(sysTemplate, ctx);
  const user =
    `${contextLines(ctx)}\n\n${JSON_SPEC[kind]}\n` +
    "Жёсткие правила: не указывай цену, суммы, скидки и проценты; не выдумывай характеристики, которых у товара нет; не упоминай конкурентов.";

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const t = await res.text();
      const msg = res.status === 401 ? "неверный API-ключ" : res.status === 429 ? "превышен лимит/квота" : t.slice(0, 160);
      return { error: `OpenAI ошибка ${res.status}: ${msg}` };
    }
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = j.choices?.[0]?.message?.content;
    if (!content) return { error: "Пустой ответ от ChatGPT" };
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { error: "ChatGPT вернул не-JSON ответ" };
    }
    if (kind === "short") return { short_description: String(parsed.short_description ?? "").trim() };
    if (kind === "full") return { description_html: String(parsed.description_html ?? "").trim() };
    return {
      meta_title: String(parsed.meta_title ?? "").trim(),
      meta_description: String(parsed.meta_description ?? "").trim(),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Сбой запроса к ChatGPT" };
  }
}
