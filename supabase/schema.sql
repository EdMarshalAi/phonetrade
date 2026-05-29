-- PhoneTrade — схема БД (self-hosted Supabase). Идемпотентна.

create table if not exists public.categories (
  slug      text primary key,
  id        text not null default '',
  title     text not null,
  image     text not null default '',
  subtitle  text,
  sort      int  not null default 0
);

create table if not exists public.products (
  id            text primary key,
  title         text not null,
  category_slug text not null,
  model         text not null default '',
  color         text not null default '',
  memory        text,
  sim           text,
  image         text not null default '',
  gallery       jsonb,
  specs         jsonb,
  description   jsonb,
  highlights    jsonb,
  price_cash    int  not null default 0,
  price_card    int  not null default 0,
  badge         text,
  condition     text,
  battery       int,
  is_used       boolean not null default false,
  is_new        boolean not null default false,
  rating        numeric,
  in_stock      boolean not null default true,
  sort          int  not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_slug);
create index if not exists products_model_idx    on public.products (model);

-- Профили + заказы (под будущую реальную авторизацию)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  phone      text unique,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id         text primary key,
  user_id    uuid references auth.users(id) on delete set null,
  phone      text not null default '',
  status     text not null default 'placed',
  delivery   text not null default '',
  total      int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id);

create table if not exists public.order_items (
  id         bigserial primary key,
  order_id   text not null references public.orders(id) on delete cascade,
  product_id text not null default '',
  title      text not null default '',
  image      text not null default '',
  qty        int  not null default 1,
  price_cash int  not null default 0
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- RLS
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select using (true);

drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select using (true);

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

drop policy if exists "orders select own" on public.orders;
create policy "orders select own" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "order_items select own" on public.order_items;
create policy "order_items select own" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
