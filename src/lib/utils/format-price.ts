const RU_FORMATTER = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return `${RU_FORMATTER.format(value)} ₽`;
}
