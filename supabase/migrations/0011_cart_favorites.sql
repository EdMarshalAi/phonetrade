-- 0011_cart_favorites.sql
-- Корзина и избранное в БД (вместо localStorage/моков).

-- Анонимная корзина по httpOnly-куке pt_cart (все операции через service role).
create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists cart_items (
  cart_id uuid not null references carts(id) on delete cascade,
  product_id text not null,
  qty int not null default 1 check (qty > 0),
  added_at timestamptz not null default now(),
  primary key (cart_id, product_id)
);
create index if not exists cart_items_cart_idx on cart_items(cart_id);

-- Избранное, привязано к пользователю (user_key = нормализованный телефон входа).
create table if not exists favorites (
  user_key text not null,
  product_id text not null,
  added_at timestamptz not null default now(),
  primary key (user_key, product_id)
);
create index if not exists favorites_user_idx on favorites(user_key);
