-- 0005_content.sql
-- Контент главной + блог + статические страницы + меню.
-- Публичный сайт читает опубликованный контент (anon select), пишут админы.

create table if not exists public.hero_slides (
  id           uuid primary key default gen_random_uuid(),
  overline     text,
  title        text not null default '',
  description  text,
  button_text  text,
  button_link  text,
  image_url    text,
  theme        text not null default 'dark' check (theme in ('dark', 'light')),
  starts_at    timestamptz,
  expires_at   timestamptz,
  sort_order   int not null default 0,
  is_published boolean not null default true
);

create table if not exists public.bento_tiles (
  id               uuid primary key default gen_random_uuid(),
  category_slug    text references public.categories(slug) on delete set null,
  custom_title     text,
  subtitle         text,
  custom_image_url text,
  size             text not null default 'medium' check (size in ('large', 'medium', 'small')),
  theme            text not null default 'light' check (theme in ('dark', 'light')),
  sort_order       int not null default 0,
  is_published     boolean not null default true
);

create table if not exists public.trade_in_block (
  id                uuid primary key default gen_random_uuid(),
  block_title       text not null default '',
  block_description text,
  button_text       text,
  button_link       text,
  image_url         text,
  is_published      boolean not null default true
);

create table if not exists public.trade_in_steps (
  id          uuid primary key default gen_random_uuid(),
  step_number int not null default 1,
  title       text not null default '',
  description text,
  icon        text,
  sort_order  int not null default 0
);

create table if not exists public.advantages (
  id           uuid primary key default gen_random_uuid(),
  icon         text,                -- lucide icon name
  title        text not null default '',
  description  text,
  sort_order   int not null default 0,
  is_published boolean not null default true
);

create table if not exists public.blog_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  title      text not null,
  color      text,
  sort_order int not null default 0
);

create table if not exists public.blog_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  excerpt          text,
  content          text,
  cover_url        text,
  category_id      uuid references public.blog_categories(id) on delete set null,
  tags             text[] not null default '{}',
  author_id        uuid references public.admin_users(id) on delete set null,
  views_count      int not null default 0,
  status           text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  meta_title       text,
  meta_description text,
  og_image_url     text,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists blog_posts_status_idx on public.blog_posts (status);

create table if not exists public.static_pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  content          text,
  meta_title       text,
  meta_description text,
  status           text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  updated_at       timestamptz not null default now()
);

create table if not exists public.menu_items (
  id             uuid primary key default gen_random_uuid(),
  menu_location  text not null check (menu_location in ('top', 'main', 'footer')),
  parent_id      uuid references public.menu_items(id) on delete cascade,
  title          text not null,
  link_url       text,
  link_type      text not null default 'url' check (link_type in ('url', 'category', 'page')),
  link_target_id text,
  sort_order     int not null default 0,
  is_visible     boolean not null default true
);
create index if not exists menu_items_location_idx on public.menu_items (menu_location);

-- RLS — публичный read опубликованного, write для админов
alter table public.hero_slides     enable row level security;
alter table public.bento_tiles     enable row level security;
alter table public.trade_in_block  enable row level security;
alter table public.trade_in_steps  enable row level security;
alter table public.advantages      enable row level security;
alter table public.blog_categories enable row level security;
alter table public.blog_posts      enable row level security;
alter table public.static_pages    enable row level security;
alter table public.menu_items      enable row level security;

drop policy if exists "hero public read" on public.hero_slides;
create policy "hero public read" on public.hero_slides for select using (is_published);
drop policy if exists "hero admin write" on public.hero_slides;
create policy "hero admin write" on public.hero_slides for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bento public read" on public.bento_tiles;
create policy "bento public read" on public.bento_tiles for select using (is_published);
drop policy if exists "bento admin write" on public.bento_tiles;
create policy "bento admin write" on public.bento_tiles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tib public read" on public.trade_in_block;
create policy "tib public read" on public.trade_in_block for select using (is_published);
drop policy if exists "tib admin write" on public.trade_in_block;
create policy "tib admin write" on public.trade_in_block for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tis public read" on public.trade_in_steps;
create policy "tis public read" on public.trade_in_steps for select using (true);
drop policy if exists "tis admin write" on public.trade_in_steps;
create policy "tis admin write" on public.trade_in_steps for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "adv public read" on public.advantages;
create policy "adv public read" on public.advantages for select using (is_published);
drop policy if exists "adv admin write" on public.advantages;
create policy "adv admin write" on public.advantages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blogcat public read" on public.blog_categories;
create policy "blogcat public read" on public.blog_categories for select using (true);
drop policy if exists "blogcat admin write" on public.blog_categories;
create policy "blogcat admin write" on public.blog_categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blog public read" on public.blog_posts;
create policy "blog public read" on public.blog_posts for select using (status = 'published');
drop policy if exists "blog admin write" on public.blog_posts;
create policy "blog admin write" on public.blog_posts for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pages public read" on public.static_pages;
create policy "pages public read" on public.static_pages for select using (status = 'published');
drop policy if exists "pages admin write" on public.static_pages;
create policy "pages admin write" on public.static_pages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "menu public read" on public.menu_items;
create policy "menu public read" on public.menu_items for select using (is_visible);
drop policy if exists "menu admin write" on public.menu_items;
create policy "menu admin write" on public.menu_items for all using (public.is_admin()) with check (public.is_admin());
