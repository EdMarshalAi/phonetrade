import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Курсы ЦБ РФ. Источник — cbr-xml-daily.ru (JSON), фолбэк — cbr.ru (XML). */
export type CbrRates = { usd: number; eur: number; date: string; prevUsd: number | null };

export async function fetchCbrRates(): Promise<CbrRates> {
  // Основной источник — JSON-зеркало.
  try {
    const r = await fetch("https://www.cbr-xml-daily.ru/daily_json.js", {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (r.ok) {
      const j = (await r.json()) as {
        Date?: string;
        Valute?: { USD?: { Value: number; Previous?: number }; EUR?: { Value: number } };
      };
      const usd = j?.Valute?.USD?.Value;
      const eur = j?.Valute?.EUR?.Value;
      if (usd && eur) {
        return { usd, eur, date: (j.Date ?? "").slice(0, 10), prevUsd: j?.Valute?.USD?.Previous ?? null };
      }
    }
  } catch {
    // упадём на XML-фолбэк
  }

  // Фолбэк — официальный XML ЦБ.
  const r2 = await fetch("https://www.cbr.ru/scripts/XML_daily.asp", {
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!r2.ok) throw new Error("ЦБ недоступен");
  const xml = await r2.text();
  const parseVal = (code: string): number | null => {
    const m = xml.match(new RegExp(`<CharCode>${code}</CharCode>[\\s\\S]*?<Nominal>(\\d+)</Nominal>[\\s\\S]*?<Value>([\\d,]+)</Value>`));
    if (!m) return null;
    const nominal = parseInt(m[1], 10) || 1;
    return parseFloat(m[2].replace(",", ".")) / nominal;
  };
  const usd = parseVal("USD");
  const eur = parseVal("EUR");
  if (!usd || !eur) throw new Error("Не удалось разобрать курс ЦБ");
  const dateM = xml.match(/Date="([\d.]+)"/);
  const date = dateM ? dateM[1].split(".").reverse().join("-") : new Date().toISOString().slice(0, 10);
  return { usd, eur, date, prevUsd: null };
}

/** Тянет курс ЦБ и пишет в currency_rates. Возвращает курс + флаг резкого скачка (>5% за сутки). */
export async function refreshAndStoreCbr(): Promise<CbrRates & { bigChange: boolean }> {
  const rates = await fetchCbrRates();
  const db = createSupabaseAdminClient();
  await db
    .from("currency_rates")
    .upsert({ date: rates.date, usd: rates.usd, eur: rates.eur, source: "cbr-xml-daily" }, { onConflict: "date,source" });
  const bigChange = rates.prevUsd ? Math.abs(rates.usd - rates.prevUsd) / rates.prevUsd > 0.05 : false;
  return { ...rates, bigChange };
}
