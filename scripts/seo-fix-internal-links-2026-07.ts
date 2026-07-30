/**
 * Guarded one-off repair for three verified internal links stored in
 * blog_posts.content. The script is a dry run unless --apply is explicit.
 *
 * Dry run:
 *   npm run seo:fix-internal-links
 *
 * Apply only after reviewing the reported pending count:
 *   npm run seo:fix-internal-links -- --apply --expected=3
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type BlogLinkFix = {
  id: string;
  slug: string;
  publicPath: string;
  oldFragment: string;
  newFragment: string;
};

export type BlogPostLinkRow = {
  id: string;
  slug: string;
  status: string;
  content: string | null;
  updated_at: string;
};

export type LinkFixInspection = {
  fix: BlogLinkFix;
  row: BlogPostLinkRow | null;
  state: "pending" | "applied" | "invalid";
  reason: string;
};

export const LINK_FIXES: readonly BlogLinkFix[] = [
  {
    id: "0e5beed5-0a48-4141-9d9f-5cc0607c08ac",
    slug: "airpods-pro-ili-airpods-4",
    publicPath: "/blog/airpods-pro-ili-airpods-4",
    oldFragment: '<a href="/category/gadgets">каталоге аксессуаров</a>',
    newFragment: '<a href="/category/airpods">каталоге AirPods</a>',
  },
  {
    id: "fef4a333-784d-4a3f-8924-f9f022f7c1bd",
    slug: "naushniki-apple-airpods-belgorod",
    publicPath: "/blog/naushniki-apple-airpods-belgorod",
    oldFragment: '<a href="/category/gadgets">наушники Apple</a>',
    newFragment: '<a href="/category/airpods">наушники Apple</a>',
  },
  {
    id: "172bef4c-6e98-4204-a067-2e10c4b7f429",
    slug: "imac-mac-mini-belgorod",
    publicPath: "/blog/imac-mac-mini-belgorod",
    oldFragment: 'href="/blog/macbook-air-ili-pro-belgorod"',
    newFragment: 'href="/blog/macbook-air-ili-macbook-pro-2026"',
  },
] as const;

function countOccurrences(value: string, fragment: string): number {
  if (!fragment) return 0;
  let count = 0;
  let offset = 0;
  while (offset <= value.length - fragment.length) {
    const found = value.indexOf(fragment, offset);
    if (found === -1) break;
    count += 1;
    offset = found + fragment.length;
  }
  return count;
}

export function inspectLinkFix(
  row: BlogPostLinkRow | null,
  fix: BlogLinkFix
): LinkFixInspection {
  if (!row) {
    return { fix, row, state: "invalid", reason: "строка не найдена" };
  }
  if (row.id !== fix.id || row.slug !== fix.slug) {
    return {
      fix,
      row,
      state: "invalid",
      reason: `identity mismatch: ${row.id}/${row.slug}`,
    };
  }
  if (row.status !== "published") {
    return {
      fix,
      row,
      state: "invalid",
      reason: `ожидался status=published, получен ${row.status}`,
    };
  }
  if (typeof row.content !== "string") {
    return { fix, row, state: "invalid", reason: "content отсутствует" };
  }

  const oldCount = countOccurrences(row.content, fix.oldFragment);
  const newCount = countOccurrences(row.content, fix.newFragment);
  if (oldCount === 1 && newCount === 0) {
    return { fix, row, state: "pending", reason: "ожидаемый старый фрагмент найден ровно один раз" };
  }
  if (oldCount === 0 && newCount === 1) {
    return { fix, row, state: "applied", reason: "исправление уже применено" };
  }
  return {
    fix,
    row,
    state: "invalid",
    reason: `неоднозначный content: old=${oldCount}, new=${newCount}`,
  };
}

export function replaceGuardedLink(content: string, fix: BlogLinkFix): string {
  const inspection = inspectLinkFix(
    {
      id: fix.id,
      slug: fix.slug,
      status: "published",
      content,
      updated_at: "",
    },
    fix
  );
  if (inspection.state !== "pending") {
    throw new Error(`${fix.slug}: ${inspection.reason}`);
  }
  return content.replace(fix.oldFragment, fix.newFragment);
}

export function parseRunOptions(args: readonly string[]): {
  apply: boolean;
  expected: number | null;
} {
  const unknown = args.filter(
    (arg) => arg !== "--apply" && !arg.startsWith("--expected=")
  );
  if (unknown.length > 0) {
    throw new Error(`Неизвестные аргументы: ${unknown.join(", ")}`);
  }
  const expectedArgs = args.filter((arg) => arg.startsWith("--expected="));
  if (expectedArgs.length > 1) {
    throw new Error("--expected можно указать только один раз");
  }
  const expectedRaw = expectedArgs[0]?.slice("--expected=".length);
  const expected = expectedRaw == null ? null : Number.parseInt(expectedRaw, 10);
  if (expectedRaw != null && (!/^\d+$/u.test(expectedRaw) || !Number.isInteger(expected))) {
    throw new Error(`Некорректный --expected=${expectedRaw}`);
  }
  return { apply: args.includes("--apply"), expected };
}

async function rollbackApplied(
  db: SupabaseClient,
  applied: Array<{ row: BlogPostLinkRow; changedAt: string }>
): Promise<string[]> {
  const errors: string[] = [];
  for (const { row, changedAt } of [...applied].reverse()) {
    const { data, error } = await db
      .from("blog_posts")
      .update({ content: row.content, updated_at: row.updated_at })
      .eq("id", row.id)
      .eq("slug", row.slug)
      .eq("status", "published")
      .eq("updated_at", changedAt)
      .select("id");
    if (error || data?.length !== 1) {
      errors.push(`${row.slug}: ${error?.message || `rollback rows=${data?.length ?? 0}`}`);
    }
  }
  return errors;
}

export async function main(args: readonly string[] = process.argv.slice(2)): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны");
  }

  const { apply, expected } = parseRunOptions(args);
  const ids = LINK_FIXES.map((fix) => fix.id);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("blog_posts")
    .select("id,slug,status,content,updated_at")
    .in("id", ids);
  if (error) throw error;

  const rows = (data ?? []) as BlogPostLinkRow[];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const inspections = LINK_FIXES.map((fix) => inspectLinkFix(byId.get(fix.id) ?? null, fix));
  const invalid = inspections.filter((inspection) => inspection.state === "invalid");
  const pending = inspections.filter(
    (inspection): inspection is LinkFixInspection & { row: BlogPostLinkRow } =>
      inspection.state === "pending" && inspection.row !== null
  );

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    expected,
    rows: rows.length,
    pending: pending.length,
    applied: inspections.filter((inspection) => inspection.state === "applied").length,
    invalid: invalid.map(({ fix, reason }) => ({ id: fix.id, slug: fix.slug, reason })),
    changes: pending.map(({ fix }) => ({
      id: fix.id,
      slug: fix.slug,
      from: fix.oldFragment,
      to: fix.newFragment,
    })),
  }, null, 2));

  if (invalid.length > 0) {
    throw new Error("Защитная проверка трёх blog_posts не пройдена; изменений нет");
  }
  if (!apply) {
    console.log(
      pending.length === 0
        ? "Все три исправления уже применены."
        : `Изменений нет. Для применения добавьте --apply --expected=${pending.length}.`
    );
    return;
  }
  if (pending.length === 0) {
    console.log("Все три исправления уже применены; повторная запись не требуется.");
    return;
  }
  if (!Number.isInteger(expected) || expected !== pending.length) {
    throw new Error(
      `Защитная проверка не пройдена: expected=${expected ?? "не задан"}, pending=${pending.length}`
    );
  }

  const changedAt = new Date().toISOString();
  const appliedRows: Array<{ row: BlogPostLinkRow; changedAt: string }> = [];
  try {
    for (const { fix, row } of pending) {
      const nextContent = replaceGuardedLink(row.content!, fix);
      const { data: updated, error: updateError } = await db
        .from("blog_posts")
        .update({ content: nextContent, updated_at: changedAt })
        .eq("id", fix.id)
        .eq("slug", fix.slug)
        .eq("status", "published")
        .eq("updated_at", row.updated_at)
        .select("id,slug,status,content,updated_at");
      if (updateError) throw updateError;
      if (updated?.length !== 1) {
        throw new Error(`${fix.slug}: конкурентное изменение, updated rows=${updated?.length ?? 0}`);
      }
      const verification = inspectLinkFix(updated[0] as BlogPostLinkRow, fix);
      if (verification.state !== "applied") {
        throw new Error(`${fix.slug}: проверка после UPDATE не пройдена (${verification.reason})`);
      }
      appliedRows.push({ row, changedAt });
    }

    const { data: audit, error: auditError } = await db
      .from("admin_audit_log")
      .insert({
        user_id: null,
        action: "bulk_update",
        entity_type: "blog_post",
        entity_id: "seo-recovery-2026-07-internal-links",
        changes: {
          reason: "replace two broken category links and one internal redirect with canonical targets",
          changed_at: changedAt,
          public_paths: pending.map(({ fix }) => fix.publicPath),
          replacements: pending.map(({ fix }) => ({
            id: fix.id,
            slug: fix.slug,
            old_fragment: fix.oldFragment,
            new_fragment: fix.newFragment,
          })),
          backup: Object.fromEntries(pending.map(({ row }) => [row.id, {
            slug: row.slug,
            content: row.content,
            updated_at: row.updated_at,
          }])),
        },
      })
      .select("id");
    if (auditError) throw auditError;
    if (audit?.length !== 1) throw new Error(`audit rows=${audit?.length ?? 0}`);
  } catch (error) {
    const rollbackErrors = await rollbackApplied(db, appliedRows);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      rollbackErrors.length > 0
        ? `${message}; ошибки rollback: ${rollbackErrors.join("; ")}`
        : `${message}; применённые UPDATE отменены`
    );
  }

  console.log(
    `Готово: исправлено ${pending.length} blog_posts; backup и точные замены записаны в admin_audit_log.`
  );
}

const isDirectRun = Boolean(
  process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
);
if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
