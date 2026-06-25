-- 0021: наценка по КАРТЕ — теперь per-category (categories.card_markup_percent).
-- Раньше карта считалась по единой pricing_settings.card_markup_percent (15%).
-- Проблема: у Б/У карта исторически ~ нал × 1.30, и единые 15% её занижали.
-- Решение: у каждой категории своя наценка карты (рядом с обычной наценкой);
-- категориям Б/У выставляем 30%. recalculate_all_prices берёт наценку карты из
-- категории товара (fallback — глобальная pricing_settings.card_markup_percent,
-- которая остаётся как запасное значение). Б/У (type='used') в функцию не входят —
-- их карту считает inline-правка цены в прайсе (updateOverrideCash) по той же
-- категорийной наценке.

alter table public.categories add column if not exists card_markup_percent numeric;

-- заполняем: всем — прежняя глобальная (15), категориям Б/У — 30
update public.categories set card_markup_percent = 15 where card_markup_percent is null;
update public.categories set card_markup_percent = 30 where slug like '%used%';

-- recalculate_all_prices: наценка карты из категории (coalesce с глобальной)
create or replace function public.recalculate_all_prices(p_reason text default 'fx_recalc'::text, p_user_id uuid default null::uuid, p_ids text[] default null::text[])
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  s record;
  p record;
  base numeric;
  step numeric;
  v_markup numeric;
  v_cash numeric; v_card numeric; v_c6 numeric; v_c12 numeric; v_c24 numeric;
  n int := 0;
begin
  select * into s from public.pricing_settings where id = 1;
  if s is null then return 0; end if;
  step := greatest(s.price_rounding, 1);

  for p in
    select pr.id, pr.cost_usd,
           coalesce(c.markup_percent, s.default_markup_percent) as markup,
           coalesce(c.card_markup_percent, s.card_markup_percent) as card_markup
    from public.products pr
    left join public.categories c on c.slug = pr.category_slug
    where pr.price_override = false
      and pr.cost_usd is not null
      and coalesce(pr.is_used, false) = false
      and coalesce(pr.type,'new') <> 'used'
      and pr.deleted_at is null
      and (p_ids is null or pr.id = any(p_ids))
  loop
    v_markup := coalesce(p.markup, s.default_markup_percent, 0);
    -- наценка категории применяется к рабочему курсу (как раньше FX-наценка)
    base := p.cost_usd * s.working_usd_rate * (1 + v_markup / 100.0);
    v_cash := round(base / step) * step;
    v_card := round(base * (1 + coalesce(p.card_markup, s.card_markup_percent) / 100.0) / step) * step;
    v_c6  := round(base * (1 + s.credit_6m_markup_percent / 100.0) / step) * step;
    v_c12 := round(base * (1 + s.credit_12m_markup_percent / 100.0) / step) * step;
    v_c24 := round(base * (1 + s.credit_24m_markup_percent / 100.0) / step) * step;

    update public.products set
      price_cash = v_cash,
      price_card = v_card,
      credit_6m_total = v_c6,  credit_6m_monthly  = round(v_c6 / 6.0),
      credit_12m_total = v_c12, credit_12m_monthly = round(v_c12 / 12.0),
      credit_24m_total = v_c24, credit_24m_monthly = round(v_c24 / 24.0),
      installment_from = round(v_c24 / 24.0),
      prices_recalculated_at = now(),
      updated_at = now()
    where id = p.id;

    insert into public.product_price_history
      (product_id, cost_usd, price_cash, price_card, credit_6m_total, credit_12m_total, credit_24m_total, reason, changed_by)
    values (p.id, p.cost_usd, v_cash, v_card, v_c6, v_c12, v_c24, p_reason, p_user_id);

    n := n + 1;
  end loop;
  return n;
end;
$function$;
