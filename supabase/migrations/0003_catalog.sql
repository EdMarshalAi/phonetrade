-- 0003_catalog.sql
-- Каталог: варианты товара, изображения, бренды, цены trade-in.
-- product_id/category — text (под живой формат ключей products.id / categories.slug).

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products(id) on delete cascade,
  memory      text,
  color       text,
  color_hex   text,
  sku         text unique,
  price_cash  int,
  price_card  int,
  stock       int,
  image_url   text,
  sort_order  int not null default 0
);
create index if not exists product_variants_product_idx on public.product_variants (product_id);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  url         text not null,
  alt         text,
  sort_order  int not null default 0,
  is_primary  boolean not null default false
);
create index if not exists product_images_product_idx on public.product_images (product_id);

create table if not exists public.brands (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  logo_url     text,
  link_url     text,
  sort_order   int not null default 0,
  is_published boolean not null default true
);

create table if not exists public.trade_in_prices (
  id           uuid primary key default gen_random_uuid(),
  model        text not null,
  base_price   int not null default 0,
  coefficients jsonb not null default '{"perfect":1.0,"good":0.85,"fair":0.6,"broken":0.3}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- RLS
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.brands           enable row level security;
alter table public.trade_in_prices  enable row level security;

drop policy if exists "variants public read" on public.product_variants;
create policy "variants public read" on public.product_variants for select using (true);
drop policy if exists "variants admin write" on public.product_variants;
create policy "variants admin write" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "images public read" on public.product_images;
create policy "images public read" on public.product_images for select using (true);
drop policy if exists "images admin write" on public.product_images;
create policy "images admin write" on public.product_images for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "brands public read" on public.brands;
create policy "brands public read" on public.brands for select using (is_published);
drop policy if exists "brands admin write" on public.brands;
create policy "brands admin write" on public.brands for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tradein public read" on public.trade_in_prices;
create policy "tradein public read" on public.trade_in_prices for select using (true);
drop policy if exists "tradein admin write" on public.trade_in_prices;
create policy "tradein admin write" on public.trade_in_prices for all using (public.is_admin()) with check (public.is_admin());
