-- 0017: аналитика промокодов (docs/promo-analytics-phone-validation.md, задача 1).
-- Soft-delete промокодов + лог применений со снапшотами (история сохраняется
-- после удаления/переименования промокода) + SQL-функции статистики.
-- Адаптация под схему PhoneTrade: orders.id — text (не uuid).

alter table public.promo_codes add column if not exists deleted_at timestamptz;
create index if not exists idx_promo_codes_active on public.promo_codes(code) where deleted_at is null;

create table if not exists public.promo_code_usages (
  id bigserial primary key,
  promo_code_id uuid references public.promo_codes(id) on delete restrict,
  promo_code_snapshot text not null,
  promo_type_snapshot text,
  promo_value_snapshot numeric,
  order_id text references public.orders(id) on delete set null,
  order_number_snapshot text,
  customer_id uuid references public.customers(id) on delete set null,
  customer_email_snapshot text,
  cart_subtotal_rub numeric(10,0) not null default 0,
  discount_amount_rub numeric(10,0) not null default 0,
  final_amount_rub numeric(10,0) not null default 0,
  source text,
  utm jsonb,
  order_status_at_use text default 'new',
  created_at timestamptz default now()
);
create index if not exists idx_promo_usages_code on public.promo_code_usages(promo_code_id);
create index if not exists idx_promo_usages_created on public.promo_code_usages(created_at desc);
create index if not exists idx_promo_usages_order on public.promo_code_usages(order_id) where order_id is not null;

alter table public.promo_code_usages enable row level security;
create policy "promo_usages admin" on public.promo_code_usages for all using (public.is_admin()) with check (public.is_admin());

create or replace function get_promo_stats(p_promo_id uuid) returns jsonb language sql stable as $fn$
  select jsonb_build_object(
    'total_uses', count(*),
    'paid_uses', count(*) filter (where order_status_at_use = 'paid'),
    'cancelled_uses', count(*) filter (where order_status_at_use = 'cancelled'),
    'pending_uses', count(*) filter (where order_status_at_use = 'new' or order_status_at_use is null),
    'total_discount_rub', coalesce(sum(discount_amount_rub) filter (where order_status_at_use = 'paid'), 0),
    'total_revenue_rub', coalesce(sum(final_amount_rub) filter (where order_status_at_use = 'paid'), 0),
    'avg_cart_rub', coalesce(round(avg(cart_subtotal_rub) filter (where order_status_at_use = 'paid')), 0),
    'unique_customers', count(distinct customer_id) filter (where customer_id is not null),
    'first_use_at', min(created_at), 'last_use_at', max(created_at),
    'conversion_rate', case when count(*) > 0 then round(count(*) filter (where order_status_at_use = 'paid')::numeric / count(*) * 100, 1) else 0 end
  ) from promo_code_usages where promo_code_id = p_promo_id;
$fn$;

create or replace function get_promo_usage_timeline(p_promo_id uuid, p_days int default 30)
returns table (date date, total_uses int, paid_uses int, discount_rub numeric, revenue_rub numeric)
language sql stable as $fn$
  select date_trunc('day', created_at)::date as date,
    count(*)::int, count(*) filter (where order_status_at_use = 'paid')::int,
    coalesce(sum(discount_amount_rub) filter (where order_status_at_use = 'paid'), 0),
    coalesce(sum(final_amount_rub) filter (where order_status_at_use = 'paid'), 0)
  from promo_code_usages
  where promo_code_id = p_promo_id and created_at >= now() - make_interval(days => p_days)
  group by date_trunc('day', created_at) order by date;
$fn$;
