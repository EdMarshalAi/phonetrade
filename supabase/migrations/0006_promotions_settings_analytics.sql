-- 0006_promotions_settings_analytics.sql
-- Промокоды, настройки магазина/SEO, интеграции (секреты), уведомления,
-- редиректы, аналитика просмотров и поисковых запросов.

create table if not exists public.promo_codes (
  id                 uuid primary key default gen_random_uuid(),
  code               text unique not null,
  discount_type      text not null default 'percent'
                       check (discount_type in ('percent', 'fixed', 'free_shipping')),
  discount_value     int not null default 0,
  min_order_amount   int not null default 0,
  starts_at          timestamptz,
  expires_at         timestamptz,
  total_limit        int,
  per_customer_limit int,
  used_count         int not null default 0,
  applies_to         text not null default 'all' check (applies_to in ('all', 'categories', 'products')),
  applies_to_ids     text[] not null default '{}',
  only_new_customers boolean not null default false,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);

-- key-value настройки (одна запись на ключ)
create table if not exists public.shop_settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);
create table if not exists public.seo_settings (
  key   text primary key,
  value jsonb not null default '{}'::jsonb
);

-- конфиг уведомлений по триггерам
create table if not exists public.notifications_config (
  trigger           text primary key,   -- 'new_order' | 'new_lead' | 'low_stock' | ...
  telegram_chat_ids text[] not null default '{}',
  email_recipients  text[] not null default '{}',
  template          text,
  is_enabled        boolean not null default true
);

-- интеграции (ключи/секреты)
create table if not exists public.integrations (
  key        text primary key,  -- 'yookassa' | 'tbank' | 'metrika' | 'ga4' | 'yandex_maps' | 'telegram' | 'smtp'
  config     jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default false
);

create table if not exists public.redirects (
  id          uuid primary key default gen_random_uuid(),
  from_path   text unique not null,
  to_path     text not null,
  status_code int not null default 301 check (status_code in (301, 302)),
  is_active   boolean not null default true
);

-- аналитика
create table if not exists public.page_views (
  id          bigserial primary key,
  path        text not null,
  referrer    text,
  utm         jsonb,
  session_id  text,
  user_agent  text,
  country     text,
  city        text,
  duration_ms int,
  created_at  timestamptz not null default now()
);
create index if not exists page_views_path_idx    on public.page_views (path);
create index if not exists page_views_created_idx on public.page_views (created_at desc);

create table if not exists public.search_queries (
  id            bigserial primary key,
  query         text not null,
  results_count int not null default 0,
  session_id    text,
  created_at    timestamptz not null default now()
);
create index if not exists search_queries_created_idx on public.search_queries (created_at desc);

-- RLS
alter table public.promo_codes          enable row level security;
alter table public.shop_settings        enable row level security;
alter table public.seo_settings         enable row level security;
alter table public.notifications_config enable row level security;
alter table public.integrations         enable row level security;
alter table public.redirects            enable row level security;
alter table public.page_views           enable row level security;
alter table public.search_queries       enable row level security;

-- promo_codes: чтение активных публично (для валидации в чекауте), управление — админ.
drop policy if exists "promo public read" on public.promo_codes;
create policy "promo public read" on public.promo_codes for select using (is_active);
drop policy if exists "promo admin write" on public.promo_codes;
create policy "promo admin write" on public.promo_codes for all using (public.is_admin()) with check (public.is_admin());

-- shop/seo settings: публичный read (контакты, SEO нужны сайту), write — админ.
drop policy if exists "shop public read" on public.shop_settings;
create policy "shop public read" on public.shop_settings for select using (true);
drop policy if exists "shop admin write" on public.shop_settings;
create policy "shop admin write" on public.shop_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "seo public read" on public.seo_settings;
create policy "seo public read" on public.seo_settings for select using (true);
drop policy if exists "seo admin write" on public.seo_settings;
create policy "seo admin write" on public.seo_settings for all using (public.is_admin()) with check (public.is_admin());

-- redirects: публичный read активных (для серверной обработки), write — админ.
drop policy if exists "redirects public read" on public.redirects;
create policy "redirects public read" on public.redirects for select using (is_active);
drop policy if exists "redirects admin write" on public.redirects;
create policy "redirects admin write" on public.redirects for all using (public.is_admin()) with check (public.is_admin());

-- integrations / notifications_config: СЕКРЕТЫ — только админ (никакого public read).
drop policy if exists "integrations admin all" on public.integrations;
create policy "integrations admin all" on public.integrations for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "notif admin all" on public.notifications_config;
create policy "notif admin all" on public.notifications_config for all using (public.is_admin()) with check (public.is_admin());

-- аналитика: anon вставляет события, читают админы.
drop policy if exists "pv public insert" on public.page_views;
create policy "pv public insert" on public.page_views for insert with check (true);
drop policy if exists "pv admin read" on public.page_views;
create policy "pv admin read" on public.page_views for select using (public.is_admin());

drop policy if exists "sq public insert" on public.search_queries;
create policy "sq public insert" on public.search_queries for insert with check (true);
drop policy if exists "sq admin read" on public.search_queries;
create policy "sq admin read" on public.search_queries for select using (public.is_admin());
