/**
 * Артикул (SKU) товара. Формула: PH{код категории}-{уникальный номер}.
 * Пример: PH584-1042.
 *  - PH — префикс магазина (PhoneTrade).
 *  - код категории — стабильные 3 цифры из slug категории (для читаемости).
 *  - номер — глобально уникальное 4-значное число (гарантирует неповторяемость).
 */

export const SKU_PREFIX = "PH";

/** Стабильный 3-значный код категории (100–999) из её slug. */
export function skuCategoryCode(categorySlug: string | null | undefined): string {
  const s = (categorySlug || "x").toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 900;
  return String(100 + h);
}

export function buildSku(categorySlug: string | null | undefined, num: number): string {
  return `${SKU_PREFIX}${skuCategoryCode(categorySlug)}-${num}`;
}

/** Человекочитаемое описание формулы (для настроек). */
export const SKU_FORMULA_HINT =
  "SKU = PH{код категории}-{уникальный номер}, напр. PH584-1042. " +
  "Префикс PH — магазин, 3 цифры — код категории, последние цифры — уникальный номер (не повторяется).";
