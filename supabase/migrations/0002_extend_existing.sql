-- 0002_extend_existing.sql
-- Аддитивное расширение живых таблиц categories / products / orders / order_items.
-- Существующие колонки и данные не трогаем — только ADD COLUMN IF NOT EXISTS.
-- Публичные read-политики сохраняются; добавляем admin-write через is_admin().

-- ── categories ─────────────────────────────────────────────────────────
alter table public.categories add column if not exists parent_slug       text;
alter table public.categories add column if not exists description        text;
alter table public.categories add column if not exists icon_url           text;
alter table public.categories add column if not exists meta_title         text;
alter table public.categories add column if not exists meta_description   text;
alter table public.categories add column if not exists available_filters  jsonb;
alter table public.categories add column if not exists is_published       boolean not null default true;
alter table public.categories add column if not exists updated_at         timestamptz not null default now();

-- ── products ───────────────────────────────────────────────────────────
alter table public.products add column if not exists slug                 text;
alter table public.products add column if not exists sku                  text;
alter table public.products add column if not exists short_description    text;
alter table public.products add column if not exists type                 text not null default 'new'
                                                       check (type in ('new', 'used'));
alter table public.products add column if not exists badges               text[] not null default '{}';
alter table public.products add column if not exists price_old            int;
alter table public.products add column if not exists installment_from     int;
alter table public.products add column if not exists installment_partner  text;
alter table public.products add column if not exists warranty_months      int;
alter table public.products add column if not exists stock                int;
alter table public.products add column if not exists min_stock            int;
alter table public.products add column if not exists is_available         boolean not null default true;
alter table public.products add column if not exists status               text not null default 'published'
                                                       check (status in ('draft', 'published', 'archived'));
alter table public.products add column if not exists condition_text       text;
alter table public.products add column if not exists condition_category   text;  -- 'perfect' | 'good' | 'fair'
alter table public.products add column if not exists meta_title           text;
alter table public.products add column if not exists meta_description     text;
alter table public.products add column if not exists og_image_url         text;
alter table public.products add column if not exists canonical_url        text;
alter table public.products add column if not exists is_indexable         boolean not null default true;
alter table public.products add column if not exists related_product_ids  text[] not null default '{}';
alter table public.products add column if not exists updated_at           timestamptz not null default now();
alter table public.products add column if not exists published_at         timestamptz;
alter table public.products add column if not exists deleted_at           timestamptz;

create unique index if not exists products_slug_uidx on public.products (slug) where slug is not null;
create unique index if not exists products_sku_uidx  on public.products (sku)  where sku  is not null;
create index if not exists products_status_idx       on public.products (status);
create index if not exists products_type_idx         on public.products (type);

-- ── orders ─────────────────────────────────────────────────────────────
alter table public.orders add column if not exists order_number     text;
alter table public.orders add column if not exists customer_id       uuid;  -- → customers.id (0004)
alter table public.orders add column if not exists customer_type     text not null default 'individual'
                                                     check (customer_type in ('individual', 'legal'));
alter table public.orders add column if not exists customer_name     text;
alter table public.orders add column if not exists customer_email    text;
alter table public.orders add column if not exists delivery_method   text;  -- 'pickup' | 'courier'
alter table public.orders add column if not exists delivery_address  text;
alter table public.orders add column if not exists delivery_date     date;
alter table public.orders add column if not exists delivery_cost     int not null default 0;
alter table public.orders add column if not exists payment_method    text;  -- 'sbp' | 'card' | 'on_delivery' | 'installment'
alter table public.orders add column if not exists payment_status    text not null default 'pending'
                                                     check (payment_status in ('pending', 'paid', 'refunded'));
alter table public.orders add column if not exists promo_code        text;
alter table public.orders add column if not exists subtotal          int not null default 0;
alter table public.orders add column if not exists discount_cash     int not null default 0;
alter table public.orders add column if not exists discount_promo    int not null default 0;
alter table public.orders add column if not exists manager_notes     text;
alter table public.orders add column if not exists utm               jsonb;
alter table public.orders add column if not exists updated_at        timestamptz not null default now();
alter table public.orders add column if not exists deleted_at        timestamptz;

create unique index if not exists orders_number_uidx on public.orders (order_number) where order_number is not null;
create index if not exists orders_status_idx  on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ── order_items ────────────────────────────────────────────────────────
alter table public.order_items add column if not exists variant_id    uuid;  -- → product_variants.id (0003)
alter table public.order_items add column if not exists sku           text;
alter table public.order_items add column if not exists price_card    int not null default 0;
alter table public.order_items add column if not exists applied_price int not null default 0;
alter table public.order_items add column if not exists total         int not null default 0;

-- ── Admin-write политики на существующие таблицы (read остаётся публичным) ─
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders admin all" on public.orders;
create policy "orders admin all" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items admin all" on public.order_items;
create policy "order_items admin all" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());
