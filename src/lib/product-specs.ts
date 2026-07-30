import type { ProductSpec } from "@/lib/data/products";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function positiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function appendUnique(
  specs: ProductSpec[],
  seenLabels: Set<string>,
  label: string,
  value: string | null
): void {
  if (!value) return;
  const normalizedLabel = label.trim();
  const normalizedValue = value.trim();
  if (!normalizedLabel || !normalizedValue) return;

  const key = normalizedLabel.toLocaleLowerCase("ru-RU");
  if (seenLabels.has(key)) return;
  seenLabels.add(key);
  specs.push({ label: normalizedLabel, value: normalizedValue });
}

function normalizeCanonicalSpecs(value: unknown[]): ProductSpec[] {
  const specs: ProductSpec[] = [];
  const seenLabels = new Set<string>();

  for (const item of value) {
    if (!isJsonObject(item)) continue;
    const label = cleanText(item.label);
    const specValue = cleanText(item.value);
    if (!label || !specValue) continue;
    appendUnique(specs, seenLabels, label, specValue);
  }

  return specs;
}

function normalizeImportExtras(
  value: unknown,
  specs: ProductSpec[],
  seenLabels: Set<string>
): void {
  if (!Array.isArray(value)) return;

  for (const item of value) {
    const token = cleanText(item);
    if (!token) continue;

    const separator = token.indexOf(":");
    if (separator <= 0 || separator === token.length - 1) continue;
    const kind = token.slice(0, separator);
    const rawValue = token.slice(separator + 1).trim();

    if (kind === "chip" && /^[a-z0-9 +.-]+$/iu.test(rawValue)) {
      appendUnique(specs, seenLabels, "Чип", rawValue);
    } else if (kind === "connectivity") {
      const connectivity: Record<string, string> = {
        wifi: "Wi‑Fi",
        gps_cellular: "GPS + Cellular",
      };
      appendUnique(
        specs,
        seenLabels,
        "Связь",
        connectivity[rawValue] ?? null
      );
    }
  }
}

/**
 * Converts both the current `{label, value}[]` format and the legacy importer
 * object into safe, human-readable characteristics. Unknown importer keys are
 * intentionally ignored so internal pricing/source metadata never reaches the
 * storefront.
 */
export function normalizeProductSpecs(value: unknown): ProductSpec[] | undefined {
  if (Array.isArray(value)) {
    const canonical = normalizeCanonicalSpecs(value);
    return canonical.length > 0 ? canonical : undefined;
  }
  if (!isJsonObject(value)) return undefined;

  const specs: ProductSpec[] = [];
  const seenLabels = new Set<string>();

  appendUnique(specs, seenLabels, "Тип", cleanText(value.subtype));
  appendUnique(specs, seenLabels, "Устройство", cleanText(value.device));

  const memory = positiveNumber(value.memory_gb);
  appendUnique(
    specs,
    seenLabels,
    "Объём памяти",
    memory === null ? null : `${memory} ГБ`
  );

  const ram = positiveNumber(value.ram_gb);
  appendUnique(
    specs,
    seenLabels,
    "Оперативная память",
    ram === null ? null : `${ram} ГБ`
  );

  const watchSize = positiveNumber(value.watch_size_mm);
  appendUnique(
    specs,
    seenLabels,
    "Размер корпуса",
    watchSize === null ? null : `${watchSize} мм`
  );

  appendUnique(
    specs,
    seenLabels,
    "Цвет",
    cleanText(value.color_ru) ?? cleanText(value.color_en)
  );
  appendUnique(
    specs,
    seenLabels,
    "Совместимость",
    cleanText(value.device_compat)
  );
  normalizeImportExtras(value.extras, specs, seenLabels);

  return specs.length > 0 ? specs : undefined;
}
