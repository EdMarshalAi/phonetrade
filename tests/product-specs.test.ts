import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeProductSpecs } from "@/lib/product-specs";

test("canonical product specs are trimmed, validated and deduplicated", () => {
  assert.deepEqual(
    normalizeProductSpecs([
      { label: " Цвет ", value: " Чёрный " },
      { label: "цвет", value: "Не должен дублироваться" },
      { label: "Память", value: "256 ГБ" },
      { label: "", value: "invalid" },
      { label: "invalid", value: 123 },
      null,
    ]),
    [
      { label: "Цвет", value: "Чёрный" },
      { label: "Память", value: "256 ГБ" },
    ]
  );
});

test("legacy importer specs expose only useful storefront characteristics", () => {
  assert.deepEqual(
    normalizeProductSpecs({
      subtype: "Смарт-часы",
      device: "Watch",
      memory_gb: 64,
      ram_gb: null,
      watch_size_mm: 49,
      color_ru: "Натуральный титан",
      color_en: "Natural Titanium",
      device_compat: "iPhone",
      extras: ["chip:M4", "connectivity:gps_cellular", "private:value"],
      color_hex: "#c7bfb2",
      description_source: "internal-import",
      inverted_cost: true,
    }),
    [
      { label: "Тип", value: "Смарт-часы" },
      { label: "Устройство", value: "Watch" },
      { label: "Объём памяти", value: "64 ГБ" },
      { label: "Размер корпуса", value: "49 мм" },
      { label: "Цвет", value: "Натуральный титан" },
      { label: "Совместимость", value: "iPhone" },
      { label: "Чип", value: "M4" },
      { label: "Связь", value: "GPS + Cellular" },
    ]
  );
});

test("empty, malformed and service-only specs do not render", () => {
  assert.equal(normalizeProductSpecs(null), undefined);
  assert.equal(normalizeProductSpecs([]), undefined);
  assert.equal(normalizeProductSpecs([{ label: "", value: "" }]), undefined);
  assert.equal(
    normalizeProductSpecs({
      color_hex: "#000000",
      description_source: "internal-import",
      inverted_cost: true,
      extras: ["unknown:value"],
    }),
    undefined
  );
});

test("product mapping and detail shell keep specs normalization guarded", () => {
  const root = process.cwd();
  const mapping = readFileSync(resolve(root, "src/lib/supabase/types.ts"), "utf8");
  const shell = readFileSync(
    resolve(root, "src/components/product-detail/ProductDetailShell.tsx"),
    "utf8"
  );

  assert.match(mapping, /specs:\s*normalizeProductSpecs\(r\.specs\)/u);
  assert.match(shell, /product\.specs\s*&&\s*product\.specs\.length\s*>\s*0/u);
  assert.match(shell, /<ProductSpecs specs=\{product\.specs\}\s*\/>/u);
});
