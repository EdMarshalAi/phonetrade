-- 0020: брошенные корзины (docs/email-marketing.md §6.1). Корзина уже была
-- персистентной (carts + cart_items по httpOnly-куке) — добавляем связь с
-- клиентом, статус и сегмент. Детект + постановка писем — в коде
-- (src/lib/email/abandoned-carts.ts), дёргается cron-ом process-email-queue.

alter table public.carts add column if not exists user_id uuid;
alter table public.carts add column if not exists customer_id uuid;
alter table public.carts add column if not exists email text;
alter table public.carts add column if not exists status text not null default 'active';
alter table public.carts add column if not exists abandoned_at timestamptz;
create index if not exists idx_carts_active_updated on public.carts(updated_at) where status = 'active';

-- Сегмент брошенных корзин (активная корзина с товарами + согласие на маркетинг).
create or replace view public.segment_cart_abandoners as
select distinct c.id, coalesce(c.email, ct.email) as email, c.name
from public.carts ct
join public.customers c on c.id = ct.customer_id
join public.data_consents dc on dc.customer_id = c.id
where ct.status = 'active'
  and coalesce(c.email, ct.email) is not null and coalesce(c.is_bounced, false) = false
  and exists (select 1 from public.cart_items ci where ci.cart_id = ct.id)
  and dc.consent_type = 'marketing' and dc.revoked_at is null
  and ct.updated_at >= now() - interval '30 days';

-- Триггеры abandoned_cart_1h / abandoned_cart_24h активируются (is_active=true).
update public.email_triggers set is_active = true where slug in ('abandoned_cart_1h', 'abandoned_cart_24h');
