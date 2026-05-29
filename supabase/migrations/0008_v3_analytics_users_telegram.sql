-- 0008_v3_analytics_users_telegram.sql
-- Расширение под spec v3: роли owner/analytics, приглашения, аудит-архив,
-- трекинг-таблицы аналитики, Telegram-бот/email/уведомления. Аддитивно.

-- ── admin_users: новые поля + расширение ролей ────────────────────────
alter table public.admin_users add column if not exists avatar_url       text;
alter table public.admin_users add column if not exists invited_by       uuid references public.admin_users(id) on delete set null;
alter table public.admin_users add column if not exists extra_permissions jsonb;
alter table public.admin_users add column if not exists last_login_ip    inet;
alter table public.admin_users add column if not exists updated_at       timestamptz not null default now();
do $$ begin
  alter table public.admin_users drop constraint if exists admin_users_role_check;
  alter table public.admin_users add constraint admin_users_role_check
    check (role in ('owner','admin','manager','content','analytics'));
end $$;

-- ── Приглашения в админку ─────────────────────────────────────────────
create table if not exists public.admin_invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  full_name   text,
  role        text not null default 'manager',
  token       text unique not null,
  message     text,
  status      text not null default 'sent' check (status in ('sent','accepted','expired','revoked')),
  invited_by  uuid references public.admin_users(id) on delete set null,
  user_id     uuid references public.admin_users(id) on delete set null,
  expires_at  timestamptz,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
create unique index if not exists admin_invites_pending_email
  on public.admin_invitations (email) where status = 'sent';

-- ── Аудит-архив + снэпшот-поля в горячей таблице ──────────────────────
alter table public.admin_audit_log add column if not exists user_email   text;
alter table public.admin_audit_log add column if not exists entity_title text;
do $$ begin
  alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
end $$;
create table if not exists public.admin_audit_log_archive (
  id          bigint primary key,
  user_id     uuid,
  user_email  text,
  action      text,
  entity_type text,
  entity_id   text,
  entity_title text,
  changes     jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz,
  archived_at timestamptz not null default now()
);

-- ── products: cost_price (для маржи) ──────────────────────────────────
alter table public.products add column if not exists cost_price int;

-- ── orders: причина отмены ────────────────────────────────────────────
alter table public.orders add column if not exists cancel_reason text;

-- ── page_views: расширение для аналитики сайта ────────────────────────
alter table public.page_views add column if not exists visitor_id     text;
alter table public.page_views add column if not exists is_new_visitor boolean;
alter table public.page_views add column if not exists device_type    text;
alter table public.page_views add column if not exists browser        text;
alter table public.page_views add column if not exists os             text;
alter table public.page_views add column if not exists region         text;
alter table public.page_views add column if not exists scroll_depth   int;
alter table public.page_views add column if not exists lcp_ms         int;
alter table public.page_views add column if not exists inp_ms         int;
alter table public.page_views add column if not exists cls            numeric;
create index if not exists page_views_visitor_idx on public.page_views (visitor_id);

-- ── search_queries: расширение ────────────────────────────────────────
alter table public.search_queries add column if not exists normalized_query  text;
alter table public.search_queries add column if not exists clicked_product_id text;
alter table public.search_queries add column if not exists visitor_id         text;

-- ── Сессии (агрегаты) ─────────────────────────────────────────────────
create table if not exists public.sessions (
  id          text primary key,
  visitor_id  text,
  started_at  timestamptz,
  ended_at    timestamptz,
  pages_count int not null default 0,
  duration_ms int,
  source      text,
  device_type text,
  city        text,
  converted_to_order_id text,
  is_bounce   boolean
);

-- ── События воронки ───────────────────────────────────────────────────
create table if not exists public.funnel_events (
  id         bigserial primary key,
  session_id text,
  visitor_id text,
  event_type text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_type_idx    on public.funnel_events (event_type);
create index if not exists funnel_events_created_idx on public.funnel_events (created_at desc);
create index if not exists funnel_events_session_idx on public.funnel_events (session_id);

-- ── Брошенные корзины ─────────────────────────────────────────────────
create table if not exists public.abandoned_carts (
  id               uuid primary key default gen_random_uuid(),
  session_id       text,
  visitor_id       text,
  customer_phone   text,
  customer_email   text,
  items            jsonb,
  total            int not null default 0,
  last_activity_at timestamptz,
  reminded_at      timestamptz,
  recovered_order_id text,
  created_at       timestamptz not null default now()
);

-- ── Wishlist ──────────────────────────────────────────────────────────
create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  visitor_id  text,
  customer_id uuid references public.customers(id) on delete set null,
  product_id  text references public.products(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  added_at    timestamptz not null default now(),
  unique (visitor_id, product_id, variant_id)
);

-- ── Hero CTR + блог-просмотры ─────────────────────────────────────────
create table if not exists public.hero_slide_events (
  id         bigserial primary key,
  slide_id   uuid references public.hero_slides(id) on delete cascade,
  event_type text not null check (event_type in ('view','click')),
  session_id text,
  created_at timestamptz not null default now()
);
create table if not exists public.blog_post_views (
  id                bigserial primary key,
  post_id           uuid references public.blog_posts(id) on delete cascade,
  session_id        text,
  visitor_id        text,
  read_duration_ms  int,
  scroll_depth      int,
  led_to_product_view boolean,
  created_at        timestamptz not null default now()
);

-- ── Telegram: конфиг бота + чаты + лог ────────────────────────────────
create table if not exists public.telegram_bot_config (
  id               int primary key default 1,
  bot_token        text,
  bot_username     text,
  webhook_url      text,
  webhook_secret   text,
  commands_enabled boolean not null default false,
  is_active        boolean not null default false,
  updated_at       timestamptz not null default now()
);
create table if not exists public.telegram_chats (
  id               uuid primary key default gen_random_uuid(),
  chat_id          text unique not null,
  title            text,
  chat_type        text not null default 'personal' check (chat_type in ('personal','group','channel')),
  registered_by    uuid references public.admin_users(id) on delete set null,
  enabled_triggers text[] not null default '{}',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
-- временные коды подтверждения регистрации чата
create table if not exists public.telegram_register_codes (
  code       text primary key,
  chat_id    text not null,
  chat_title text,
  chat_type  text,
  created_at timestamptz not null default now()
);

-- ── notifications_config: расширение под каналы/шаблоны ───────────────
alter table public.notifications_config add column if not exists channels               text[] not null default '{telegram}';
alter table public.notifications_config add column if not exists template_telegram      text;
alter table public.notifications_config add column if not exists template_email_subject text;
alter table public.notifications_config add column if not exists template_email_html    text;

-- ── notification_log ──────────────────────────────────────────────────
create table if not exists public.notification_log (
  id                  bigserial primary key,
  trigger             text,
  channel             text,
  recipient           text,
  status              text not null default 'sent',
  payload             jsonb,
  error_message       text,
  related_entity_type text,
  related_entity_id   text,
  created_at          timestamptz not null default now()
);
create index if not exists notification_log_created_idx on public.notification_log (created_at desc);

-- ── email_templates + отписки ─────────────────────────────────────────
create table if not exists public.email_templates (
  id        text primary key,
  subject   text,
  html      text,
  variables text[] not null default '{}',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.email_unsubscribes (
  email           text primary key,
  unsubscribed_at timestamptz not null default now(),
  reason          text
);

-- ── RLS ───────────────────────────────────────────────────────────────
alter table public.admin_invitations      enable row level security;
alter table public.admin_audit_log_archive enable row level security;
alter table public.sessions                enable row level security;
alter table public.funnel_events           enable row level security;
alter table public.abandoned_carts         enable row level security;
alter table public.wishlists               enable row level security;
alter table public.hero_slide_events       enable row level security;
alter table public.blog_post_views         enable row level security;
alter table public.telegram_bot_config     enable row level security;
alter table public.telegram_chats          enable row level security;
alter table public.telegram_register_codes enable row level security;
alter table public.notification_log        enable row level security;
alter table public.email_templates         enable row level security;
alter table public.email_unsubscribes      enable row level security;

-- admin-only таблицы (service-role обходит RLS; для authed-админов — is_admin())
do $$
declare t text;
begin
  foreach t in array array['admin_invitations','admin_audit_log_archive','telegram_bot_config','telegram_chats','telegram_register_codes','notification_log','email_templates']
  loop
    execute format('drop policy if exists "%s admin all" on public.%I', t, t);
    execute format('create policy "%s admin all" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- трекинг: anon insert, admin read
do $$
declare t text;
begin
  foreach t in array array['sessions','funnel_events','abandoned_carts','wishlists','hero_slide_events','blog_post_views']
  loop
    execute format('drop policy if exists "%s public insert" on public.%I', t, t);
    execute format('create policy "%s public insert" on public.%I for insert with check (true)', t, t);
    execute format('drop policy if exists "%s admin read" on public.%I', t, t);
    execute format('create policy "%s admin read" on public.%I for select using (public.is_admin())', t, t);
  end loop;
end $$;

-- wishlist: аноним может читать/удалять свои (по visitor_id) — упрощённо public read
drop policy if exists "wishlists public select" on public.wishlists;
create policy "wishlists public select" on public.wishlists for select using (true);
drop policy if exists "wishlists public delete" on public.wishlists;
create policy "wishlists public delete" on public.wishlists for delete using (true);

-- email_unsubscribes: anon insert (отписка по ссылке)
drop policy if exists "unsub public insert" on public.email_unsubscribes;
create policy "unsub public insert" on public.email_unsubscribes for insert with check (true);
drop policy if exists "unsub admin all" on public.email_unsubscribes;
create policy "unsub admin all" on public.email_unsubscribes for all using (public.is_admin()) with check (public.is_admin());
