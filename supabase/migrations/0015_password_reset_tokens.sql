-- 0015: токены сброса пароля (витрина + админка).
--
-- Свой токен-флоу через наш SMTP (mail.hosting.reg.ru): встроенный сброс
-- Supabase слать на реальную почту не может — аккаунты витрины создаются на
-- синтетический email {цифры}@phonetrade.local, реальный email лежит в
-- profiles.email. Поэтому генерим токен, шлём ссылку письмом и по токену
-- меняем пароль через admin.updateUserById.
--
-- audience: 'storefront' (профиль покупателя) | 'admin' (admin_users).
-- user_id = auth.users.id (для обоих: profiles.id и admin_users.id = auth id).
-- RLS включён без политик → доступ только service-role (наш серверный клиент).

create table if not exists public.password_reset_tokens (
  token text primary key,
  user_id uuid not null,
  audience text not null check (audience in ('storefront', 'admin')),
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_prt_user on public.password_reset_tokens(user_id);
alter table public.password_reset_tokens enable row level security;
