/**
 * Расчёт цен товара из закупки в долларах и настроек прайса.
 * ВАЖНО: все наценки считаются от base (неокруглённой), а не каскадно от
 * округлённой цены нал — иначе наценки расходятся (баг исходного Excel).
 * Та же логика продублирована в Postgres-функции recalculate_all_prices().
 */

export type PricingSettings = {
  working_usd_rate: number;
  fx_markup_percent: number;
  card_markup_percent: number;
  credit_6m_markup_percent: number;
  credit_12m_markup_percent: number;
  credit_24m_markup_percent: number;
  price_rounding: number;
  min_margin_percent?: number;
};

export type ProductPriceInputs = {
  cost_usd: number | null | undefined;
  price_override?: boolean;
  override_price_cash?: number | null;
  override_price_card?: number | null;
};

export type CalculatedPrices = {
  price_cash: number;
  price_card: number;
  credit_6m_total: number;
  credit_6m_monthly: number;
  credit_12m_total: number;
  credit_12m_monthly: number;
  credit_24m_total: number;
  credit_24m_monthly: number;
  base_cash: number;
};

export function roundTo(n: number, step: number): number {
  const s = step > 0 ? step : 1;
  return Math.round(n / s) * s;
}

/** Полная рабочая ставка USD с учётом FX-наценки. */
export function effectiveRate(settings: PricingSettings): number {
  return settings.working_usd_rate * (1 + settings.fx_markup_percent / 100);
}

function buildFromBase(base: number, cashOverride: number | null, cardOverride: number | null, s: PricingSettings): CalculatedPrices {
  const step = s.price_rounding;
  const price_cash = cashOverride != null ? cashOverride : roundTo(base, step);
  const price_card = cardOverride != null ? cardOverride : roundTo(base * (1 + s.card_markup_percent / 100), step);
  // Кредитные считаем от base (или от зафиксированной цены нал, если override).
  const creditBase = cashOverride != null ? cashOverride : base;
  const c6 = roundTo(creditBase * (1 + s.credit_6m_markup_percent / 100), step);
  const c12 = roundTo(creditBase * (1 + s.credit_12m_markup_percent / 100), step);
  const c24 = roundTo(creditBase * (1 + s.credit_24m_markup_percent / 100), step);
  return {
    price_cash,
    price_card,
    credit_6m_total: c6, credit_6m_monthly: Math.round(c6 / 6),
    credit_12m_total: c12, credit_12m_monthly: Math.round(c12 / 12),
    credit_24m_total: c24, credit_24m_monthly: Math.round(c24 / 24),
    base_cash: base,
  };
}

export function calculatePrices(product: ProductPriceInputs, settings: PricingSettings): CalculatedPrices | null {
  if (product.price_override && product.override_price_cash) {
    return buildFromBase(product.override_price_cash, product.override_price_cash, product.override_price_card ?? null, settings);
  }
  if (product.cost_usd == null || !Number.isFinite(product.cost_usd) || product.cost_usd <= 0) return null;
  const base = product.cost_usd * effectiveRate(settings);
  return buildFromBase(base, null, null, settings);
}

/** Маржа цены нал над закупкой в текущих ценах (в ₽ и %). */
export function margin(priceCash: number, costRub: number | null | undefined): { rub: number; percent: number } | null {
  if (!costRub || costRub <= 0 || !priceCash) return null;
  const rub = priceCash - costRub;
  return { rub, percent: (rub / costRub) * 100 };
}
