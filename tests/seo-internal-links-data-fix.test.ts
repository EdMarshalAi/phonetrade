import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  LINK_FIXES,
  inspectLinkFix,
  parseRunOptions,
  replaceGuardedLink,
  type BlogPostLinkRow,
} from "../scripts/seo-fix-internal-links-2026-07";

function rowFor(index: number, content: string): BlogPostLinkRow {
  const fix = LINK_FIXES[index];
  return {
    id: fix.id,
    slug: fix.slug,
    status: "published",
    content,
    updated_at: "2026-07-30T00:00:00.000Z",
  };
}

test("content-link data fix is limited to the three reviewed rows", () => {
  assert.equal(LINK_FIXES.length, 3);
  assert.equal(new Set(LINK_FIXES.map((fix) => fix.id)).size, 3);
  assert.equal(new Set(LINK_FIXES.map((fix) => fix.slug)).size, 3);
  assert.deepEqual(
    LINK_FIXES.map((fix) => fix.slug),
    [
      "airpods-pro-ili-airpods-4",
      "naushniki-apple-airpods-belgorod",
      "imac-mac-mini-belgorod",
    ]
  );
  assert.equal(
    LINK_FIXES.filter((fix) => fix.newFragment.includes("/category/airpods")).length,
    2
  );
  assert.match(
    LINK_FIXES[2].newFragment,
    /\/blog\/macbook-air-ili-macbook-pro-2026/u
  );
});

test("dry-run is the default and apply requires an explicit flag", () => {
  assert.deepEqual(parseRunOptions([]), { apply: false, expected: null });
  assert.deepEqual(parseRunOptions(["--apply", "--expected=3"]), {
    apply: true,
    expected: 3,
  });
  assert.throws(() => parseRunOptions(["--force"]), /Неизвестные аргументы/u);
  assert.throws(() => parseRunOptions(["--expected=three"]), /Некорректный/u);
});

test("each reviewed fragment is replaced exactly once and is idempotent", () => {
  for (const [index, fix] of LINK_FIXES.entries()) {
    const before = `до ${fix.oldFragment} после`;
    const pending = inspectLinkFix(rowFor(index, before), fix);
    assert.equal(pending.state, "pending");

    const after = replaceGuardedLink(before, fix);
    assert.equal(after, `до ${fix.newFragment} после`);
    assert.equal(inspectLinkFix(rowFor(index, after), fix).state, "applied");
    assert.throws(() => replaceGuardedLink(after, fix), /уже применено/u);
  }
});

test("identity, publication state and ambiguous fragments fail closed", () => {
  const fix = LINK_FIXES[0];
  assert.equal(
    inspectLinkFix({ ...rowFor(0, fix.oldFragment), slug: "wrong-slug" }, fix).state,
    "invalid"
  );
  assert.equal(
    inspectLinkFix({ ...rowFor(0, fix.oldFragment), status: "draft" }, fix).state,
    "invalid"
  );
  assert.equal(
    inspectLinkFix(rowFor(0, `${fix.oldFragment}${fix.oldFragment}`), fix).state,
    "invalid"
  );
});

test("Mac seed source links directly to the canonical article", () => {
  const source = readFileSync(
    resolve(process.cwd(), "scripts/seo-gap-content-2026-06-25.ts"),
    "utf8"
  );
  assert.doesNotMatch(source, /href="\/blog\/macbook-air-ili-pro-belgorod"/u);
  assert.match(source, /href="\/blog\/macbook-air-ili-macbook-pro-2026"/u);
});
