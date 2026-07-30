/**
 * Curated cleanup for twelve AirPods / Apple Watch products whose names contain
 * obvious spelling or model-name errors. Slugs stay unchanged to preserve the
 * indexed URLs. Full previous values are written to admin_audit_log.
 *
 * Dry run:
 *   npx tsx --env-file=.env.local scripts/seo-normalize-product-copy.ts
 *
 * Apply:
 *   npx tsx --env-file=.env.local scripts/seo-normalize-product-copy.ts --apply --expected=12
 */
import { createClient } from "@supabase/supabase-js";
import { pingIndexNow } from "../src/lib/seo/indexnow";

type ProductCopy = {
  id: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  short_description: string | null;
  description_html: string | null;
};

type ProductNormalization = {
  title: string;
  namePattern: RegExp;
  series11?: {
    size: 42 | 46;
    color: "Jet Black" | "Rose Gold";
  };
};

const NORMALIZATIONS: Record<string, ProductNormalization> = {
  "AP-WHI-01": {
    title: "Apple AirPods 4 без шумоподавления",
    namePattern: /Apple AirPods 4\s+[Бб]ез\s+шумополавлением/giu,
  },
  "AP-WHI-02": {
    title: "Apple AirPods 4 (ANC) с шумоподавлением",
    namePattern: /Apple AirPods 4\s*\(ANC\)\s*[Сс]\s+шумополавлением/giu,
  },
  "apple-watch-s11-42mm-jet-black": {
    title: "Apple Watch Series 11 42mm Jet Black",
    namePattern: /Apple Watch S11\s+42mm\s+Jet Black/giu,
    series11: { size: 42, color: "Jet Black" },
  },
  "apple-watch-s11-42mm-rosegold": {
    title: "Apple Watch Series 11 42mm Rose Gold",
    namePattern: /Apple Watch S11\s+42mm\s+RoseGold/giu,
    series11: { size: 42, color: "Rose Gold" },
  },
  "apple-watch-s11-46mm-jet-black": {
    title: "Apple Watch Series 11 46mm Jet Black",
    namePattern: /Apple Watch S11\s+46mm\s+Jet Black/giu,
    series11: { size: 46, color: "Jet Black" },
  },
  "apple-watch-s11-46mm-rosegold": {
    title: "Apple Watch Series 11 46mm Rose Gold",
    namePattern: /Apple Watch S11\s+46mm\s+RoseGold/giu,
    series11: { size: 46, color: "Rose Gold" },
  },
  "apple-watch-se3nd-2025-40mm-silverblue": {
    title: "Apple Watch SE 3 (2025) 40mm Silver/Blue",
    namePattern: /Apple Watch SE\s*\(\s*3nd\s*\)\s*2025\s*40mm\s*Silver\/Blue/giu,
  },
  "apple-watch-se-3nd-2025-40mm-midnight": {
    title: "Apple Watch SE 3 (2025) 40mm Midnight",
    namePattern: /Apple Watch SE\s*\(\s*3nd\s*\)\s*2025\s*40mm\s*Midnight/giu,
  },
  "apple-watch-se-3nd-2025-40mm-starlight": {
    title: "Apple Watch SE 3 (2025) 40mm Starlight",
    namePattern: /Apple Watch SE\s*\(\s*3nd\s*\)\s*2025\s*40mm\s*Starlight/giu,
  },
  "apple-watch-se3nd44mm-2025-midnight": {
    title: "Apple Watch SE 3 (2025) 44mm Midnight",
    namePattern: /Apple Watch SE\s*\(\s*3nd\s*\)\s*44mm\s*2025\s*Midnight/giu,
  },
  "apple-watch-se3nd44mm-2025-silver": {
    title: "Apple Watch SE 3 (2025) 44mm Silver",
    namePattern: /Apple Watch SE\s*\(\s*3nd\s*\)\s*44mm\s*2025\s*Silver/giu,
  },
  "apple-watch-se3nd44mm-2025-starlight": {
    title: "Apple Watch SE 3 (2025) 44mm Starlight",
    namePattern: /Apple Watch SE\s*\(\s*3nd\s*\)\s*44mm\s*2025\s*Starlight/giu,
  },
};

function normalizeText(
  value: string | null,
  normalization: ProductNormalization
): string | null {
  if (!value) return value;

  let result = value.replace(normalization.namePattern, normalization.title);

  if (normalization.series11) {
    const { size, color } = normalization.series11;
    result = result
      .replace(/Apple Watch S11/giu, "Apple Watch Series 11")
      .replace(/RoseGold/giu, "Rose Gold")
      .replace(
        /в корпусе\s+42\s*мм\s+цвета\s+Jet Black/giu,
        `в корпусе ${size} мм цвета ${color}`
      )
      .replace(
        /Корпус\s+42\s*мм,\s*цвет\s+Jet Black/giu,
        `Корпус ${size} мм, цвет ${color}`
      )
      .replace(
        /Хотите\s*<strong>Apple Watch Series 11 купить в Белгороде<\/strong>\?/giu,
        "Ищете <strong>Apple Watch Series 11 в Белгороде</strong>?"
      )
      .replace(
        /В наличии,\s*доступен заказ с доставкой по городу и самовывоз\./giu,
        "Актуальный статус и доступные способы получения указаны в карточке товара."
      );
  }

  return result;
}

function buildPatch(row: ProductCopy) {
  const normalization = NORMALIZATIONS[row.id];
  return {
    title: normalization.title,
    meta_title: `${normalization.title} — купить в Белгороде`,
    meta_description: normalizeText(row.meta_description, normalization),
    short_description: normalizeText(row.short_description, normalization),
    description_html: normalizeText(row.description_html, normalization),
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны");
  }

  const apply = process.argv.includes("--apply");
  const expectedArg = process.argv.find((arg) => arg.startsWith("--expected="));
  const expected = expectedArg ? Number.parseInt(expectedArg.split("=")[1] ?? "", 10) : null;
  const ids = Object.keys(NORMALIZATIONS);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("products")
    .select("id,title,meta_title,meta_description,short_description,description_html")
    .in("id", ids)
    .eq("status", "published")
    .is("deleted_at", null);
  if (error) throw error;

  const rows = (data ?? []) as ProductCopy[];
  const missing = ids.filter((id) => !rows.some((row) => row.id === id));
  const changes = rows
    .map((row) => ({ row, patch: buildPatch(row) }))
    .filter(({ row, patch }) => (
      row.title !== patch.title
      || row.meta_title !== patch.meta_title
      || row.meta_description !== patch.meta_description
      || row.short_description !== patch.short_description
      || row.description_html !== patch.description_html
    ));

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    candidates: rows.length,
    changed: changes.length,
    missing,
    titles: changes.map(({ row, patch }) => `${row.title} -> ${patch.title}`),
  }, null, 2));

  if (!apply) {
    console.log(changes.length === 0
      ? "Нормализация уже применена."
      : "Изменений нет. Для применения добавьте --apply --expected=<changed>.");
    return;
  }
  if (changes.length === 0) {
    console.log("Нормализация уже применена: целевые карточки совпадают с проверенными версиями.");
    return;
  }
  if (missing.length > 0 || !Number.isInteger(expected) || expected !== changes.length) {
    throw new Error(`Защитная проверка не пройдена: expected=${expected}, changed=${changes.length}, missing=${missing.join(",") || "—"}`);
  }

  const changedAt = new Date().toISOString();
  const backup = Object.fromEntries(changes.map(({ row }) => [row.id, row]));

  for (const { row, patch } of changes) {
    const { error: updateError } = await db
      .from("products")
      .update({ ...patch, updated_at: changedAt })
      .eq("id", row.id)
      .eq("status", "published")
      .is("deleted_at", null);
    if (updateError) throw updateError;
  }

  const changedIds = changes.map(({ row }) => row.id);
  const { error: auditError } = await db.from("admin_audit_log").insert({
    user_id: null,
    action: "bulk_update",
    entity_type: "product",
    entity_id: "seo-recovery-2026-07-product-copy",
    changes: {
      reason: "fix verified product-name typos and variant-specific Watch copy without changing indexed slugs",
      product_ids: changedIds,
      backup,
      changed_at: changedAt,
    },
  });
  if (auditError) throw auditError;

  await pingIndexNow([
    "/category/airpods",
    "/category/watch",
    ...changedIds.map((id) => `/product/${id}`),
  ]);
  console.log(`Готово: нормализован текст ${changedIds.length} карточек; URL сохранены; backup записан в audit log.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
