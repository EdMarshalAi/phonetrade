/**
 * One-off recovery for the July 2026 availability regression.
 *
 * The admin form historically coerced an empty stock input to numeric zero.
 * Those rows still have the explicit manual flag in_stock=true, so zero is a
 * serialization artefact rather than a reliable “out of stock” decision.
 *
 * Dry run:
 *   npx tsx --env-file=.env.local scripts/seo-recover-availability.ts
 *
 * Apply only after reviewing the dry-run count:
 *   npx tsx --env-file=.env.local scripts/seo-recover-availability.ts --apply --expected=89
 */
import { createClient } from "@supabase/supabase-js";
import { pingIndexNow } from "../src/lib/seo/indexnow";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны");
  }

  const apply = process.argv.includes("--apply");
  const expectedArg = process.argv.find((arg) => arg.startsWith("--expected="));
  const expected = expectedArg ? Number.parseInt(expectedArg.split("=")[1] ?? "", 10) : null;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("products")
    .select("id,category_slug")
    .eq("status", "published")
    .is("deleted_at", null)
    .eq("stock", 0)
    .eq("in_stock", true)
    .or("is_available.is.null,is_available.eq.true")
    .order("id");

  if (error) throw error;

  const rows = data ?? [];
  const categories = rows.reduce<Record<string, number>>((result, row) => {
    const slug = String(row.category_slug || "(без категории)");
    result[slug] = (result[slug] ?? 0) + 1;
    return result;
  }, {});

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    candidates: rows.length,
    categories,
  }, null, 2));

  if (!apply) {
    console.log("Изменений нет. Для применения добавьте --apply --expected=<candidates>.");
    return;
  }

  if (rows.length === 0) {
    console.log("Нормализация уже применена: подходящих строк больше нет.");
    return;
  }

  if (!Number.isInteger(expected) || expected !== rows.length) {
    throw new Error(`Защитная проверка не пройдена: expected=${expected ?? "не задан"}, candidates=${rows.length}`);
  }

  const changedAt = new Date().toISOString();
  for (let offset = 0; offset < rows.length; offset += 50) {
    const ids = rows.slice(offset, offset + 50).map((row) => row.id);
    const { error: updateError } = await db
      .from("products")
      .update({ stock: null, updated_at: changedAt })
      .in("id", ids)
      .eq("stock", 0)
      .eq("in_stock", true);
    if (updateError) throw updateError;
  }

  const { error: auditError } = await db.from("admin_audit_log").insert({
    user_id: null,
    action: "bulk_update",
    entity_type: "product",
    entity_id: "seo-recovery-2026-07-availability",
    changes: {
      stock: "0 -> null",
      reason: "empty stock input was coerced to zero while in_stock remained true",
      count: rows.length,
      product_ids: rows.map((row) => row.id),
      changed_at: changedAt,
    },
  });
  if (auditError) throw auditError;

  const paths = [
    "/",
    "/catalog",
    ...Object.keys(categories)
      .filter((slug) => slug !== "(без категории)")
      .map((slug) => `/category/${slug}`),
    ...rows.map((row) => `/product/${row.id}`),
  ];
  await pingIndexNow(paths);

  console.log(`Готово: stock очищен у ${rows.length} товаров; IndexNow отправлен best-effort.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
