/** Периоды для аналитики + предыдущий период для сравнения. */

export type PeriodPreset = "today" | "7d" | "30d" | "90d" | "quarter" | "year";

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Сегодня",
  "7d": "7 дней",
  "30d": "30 дней",
  "90d": "90 дней",
  quarter: "Квартал",
  year: "Год",
};

const DAYS: Record<PeriodPreset, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  quarter: 92,
  year: 365,
};

export interface Range {
  from: Date;
  to: Date;
  days: number;
}

/** Диапазон по пресету (to = сейчас, from = N дней назад на 00:00). */
export function getDateRange(preset: PeriodPreset, now = new Date()): Range {
  const days = DAYS[preset] ?? 30;
  const to = now;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from, to, days };
}

/** Предыдущий период такой же длины, прямо перед текущим. */
export function getPreviousPeriod(range: Range): Range {
  const to = new Date(range.from);
  to.setMilliseconds(to.getMilliseconds() - 1);
  const from = new Date(range.from);
  from.setDate(from.getDate() - range.days);
  return { from, to, days: range.days };
}

/** Разбор пресета из searchParams (с дефолтом 30d). */
export function parsePreset(value: string | undefined): PeriodPreset {
  const v = (value ?? "30d") as PeriodPreset;
  return (Object.keys(DAYS) as PeriodPreset[]).includes(v) ? v : "30d";
}

/** Подпись периода для подзаголовка: «1–30 мая 2026». */
export function rangeLabel(range: Range): string {
  const f = range.from.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const t = range.to.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  return `${f} — ${t}`;
}

/** Список ISO-дат (YYYY-MM-DD) внутри диапазона. */
export function daysInRange(range: Range): string[] {
  const out: string[] = [];
  const d = new Date(range.from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(range.to);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
