-- 0004_orders_customers_leads.sql
-- Клиенты, история статусов заказа, заявки (leads).

create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  phone           text unique,
  name            text,
  email           text,
  customer_type   text not null default 'individual'
                    check (customer_type in ('individual', 'legal')),
  legal_info      jsonb,
  total_orders    int not null default 0,
  total_spent     int not null default 0,
  bonuses_balance int not null default 0,
  segment         text not null default 'new'
                    check (segment in ('new', 'regular', 'vip')),
  notes           text,
  first_order_at  timestamptz,
  last_order_at   timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists customers_phone_idx on public.customers (phone);

create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    text not null references public.orders(id) on delete cascade,
  from_status text,
  to_status   text not null,
  changed_by  uuid references public.admin_users(id) on delete set null,
  comment     text,
  created_at  timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history (order_id);

create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  type          text not null default 'callback'
                  check (type in ('trade_in', 'callback', 'question', 'repair')),
  contact_phone text,
  contact_name  text,
  contact_email text,
  payload       jsonb,            -- trade-in: {model, condition, photos, estimated_price}
  status        text not null default 'new'
                  check (status in ('new', 'in_progress', 'converted', 'rejected')),
  assigned_to   uuid references public.admin_users(id) on delete set null,
  notes         text,
  source_url    text,
  utm           jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists leads_status_idx  on public.leads (status);
create index if not exists leads_type_idx     on public.leads (type);
create index if not exists leads_created_idx  on public.leads (created_at desc);

-- FK orders.customer_id → customers.id (теперь таблица существует)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'orders_customer_id_fkey' and table_name = 'orders'
  ) then
    alter table public.orders
      add constraint orders_customer_id_fkey
      foreign key (customer_id) references public.customers(id) on delete set null;
  end if;
end $$;

-- RLS
alter table public.customers            enable row level security;
alter table public.order_status_history enable row level security;
alter table public.leads                enable row level security;

drop policy if exists "customers admin all" on public.customers;
create policy "customers admin all" on public.customers for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "osh admin all" on public.order_status_history;
create policy "osh admin all" on public.order_status_history for all using (public.is_admin()) with check (public.is_admin());

-- leads: публичный сайт ВСТАВЛЯЕТ заявки (anon insert), читают/правят только админы.
drop policy if exists "leads public insert" on public.leads;
create policy "leads public insert" on public.leads for insert with check (true);
drop policy if exists "leads admin read"   on public.leads;
create policy "leads admin read" on public.leads for select using (public.is_admin());
drop policy if exists "leads admin manage" on public.leads;
create policy "leads admin manage" on public.leads for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "leads admin delete" on public.leads;
create policy "leads admin delete" on public.leads for delete using (public.is_admin());
