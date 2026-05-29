-- 0013_admin_roles.sql
-- Управляемые роли админки с правами на разделы сайдбара (permissions = href).
-- Сайдбар и доступ к разделам гейтятся по правам роли (full_access — суперадмин).

create table if not exists admin_roles (
  key text primary key,
  label text not null,
  full_access boolean not null default false,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- admin_users.role теперь ссылается на произвольный ключ роли (снимаем check).
alter table admin_users drop constraint if exists admin_users_role_check;

alter table admin_roles enable row level security;
drop policy if exists "admin_roles read for admins" on admin_roles;
create policy "admin_roles read for admins" on admin_roles for select using (public.is_admin());

-- Базовые роли: developer/owner/admin — полный доступ; manager — заказы/заявки/
-- аналитика заказов; content — каталог и контент.
insert into admin_roles (key, label, full_access, permissions, is_system, sort) values
('developer','Разработчик', true, '{}', true, 0),
('owner','Владелец', true, '{}', true, 1),
('admin','Администратор', true, '{}', true, 2),
('manager','Менеджер', false, ARRAY['/admin','/admin/orders','/admin/leads','/admin/analytics/orders'], false, 3),
('content','Контент', false, ARRAY['/admin','/admin/catalog/products','/admin/catalog/categories','/admin/catalog/brands','/admin/content/hero','/admin/content/home-blocks','/admin/content/blog','/admin/content/pages'], false, 4)
on conflict (key) do update set
  label = excluded.label, full_access = excluded.full_access,
  permissions = excluded.permissions, is_system = excluded.is_system, sort = excluded.sort;

-- Владелец магазина — роль «Разработчик» (полный доступ).
update admin_users set role = 'developer' where email = 'owner@phonetrade.ru';
