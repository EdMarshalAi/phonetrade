-- 0001_admin_core.sql
-- Ядро админки: пользователи админки, роли, helper is_admin(), журнал аудита.
-- Аддитивно: существующие таблицы не затрагиваются. Идемпотентно.

-- ── Пользователи админки ───────────────────────────────────────────────
create table if not exists public.admin_users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  full_name     text not null default '',
  role          text not null default 'manager'
                  check (role in ('admin', 'manager', 'content')),
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

-- ── Helper: текущий пользователь — активный админ? ─────────────────────
-- SECURITY DEFINER, чтобы политики могли читать admin_users без рекурсии RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.is_active
  );
$$;

-- Роль текущего админа (или null).
create or replace function public.admin_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select a.role from public.admin_users a
  where a.id = auth.uid() and a.is_active
  limit 1;
$$;

-- ── Журнал аудита ──────────────────────────────────────────────────────
create table if not exists public.admin_audit_log (
  id          bigserial primary key,
  user_id     uuid references public.admin_users(id) on delete set null,
  action      text not null,              -- 'create' | 'update' | 'delete' | 'login' | 'status_change'
  entity_type text not null default '',   -- 'product' | 'order' | 'category' | ...
  entity_id   text,
  changes     jsonb,                       -- diff
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_user_idx   on public.admin_audit_log (user_id);
create index if not exists admin_audit_entity_idx on public.admin_audit_log (entity_type, entity_id);
create index if not exists admin_audit_created_idx on public.admin_audit_log (created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.admin_users     enable row level security;
alter table public.admin_audit_log enable row level security;

-- admin_users: админ видит всех; пользователь видит себя (для бутстрапа роли).
drop policy if exists "admin_users self read"  on public.admin_users;
create policy "admin_users self read" on public.admin_users
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "admin_users admin manage" on public.admin_users;
create policy "admin_users admin manage" on public.admin_users
  for all using (public.admin_role() = 'admin')
  with check (public.admin_role() = 'admin');

-- audit-log: только чтение для админов (запись делает service-role).
drop policy if exists "audit admin read" on public.admin_audit_log;
create policy "audit admin read" on public.admin_audit_log
  for select using (public.is_admin());
