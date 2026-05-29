/**
 * Russian pluralization. `forms` = [one, few, many]:
 * plural(1, ["товар", "товара", "товаров"]) → "товар"
 * plural(3, ...) → "товара" · plural(5, ...) → "товаров"
 */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  const last = abs % 10;
  const last2 = abs % 100;
  if (last === 1 && last2 !== 11) return forms[0];
  if ([2, 3, 4].includes(last) && ![12, 13, 14].includes(last2)) return forms[1];
  return forms[2];
}

export function pluralizeItems(n: number): string {
  return plural(n, ["товар", "товара", "товаров"]);
}
