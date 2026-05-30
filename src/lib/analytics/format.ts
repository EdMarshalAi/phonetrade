/** Форматирование чисел/денег/процентов для аналитики (ru-RU). */

const RU = new Intl.NumberFormat("ru-RU");

export function formatPrice(amount: number): string {
  return `${RU.format(Math.round(amount))} ₽`;
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} млн`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1).replace(".", ",")} тыс.`;
  return RU.format(Math.round(n));
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} с`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} мин ${rest} с` : `${m} мин`;
}

export type Delta = { percent: number; direction: "up" | "down" | "flat" };

/** Дельта текущего к прошлому периоду. */
export function formatDelta(current: number, previous: number): Delta {
  if (!previous) return { percent: 0, direction: current > 0 ? "up" : "flat" };
  const change = ((current - previous) / Math.abs(previous)) * 100;
  return {
    percent: Math.abs(change),
    direction: change > 0.05 ? "up" : change < -0.05 ? "down" : "flat",
  };
}
