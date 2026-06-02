-- 0019: валидация телефонов РФ (docs/promo-analytics-phone-validation.md, задача 2).
-- Нормализация к +79XXXXXXXXX (мобильные РФ). Городские/иностранные/мусор → null.
-- БД-триггеры нормализуют ЛЮБУЮ запись телефона + constraints как последний рубеж.

create or replace function normalize_russian_phone(input text) returns text language plpgsql immutable as $fn$
declare digits text;
begin
  if input is null or input = '' then return null; end if;
  digits := regexp_replace(input, '[^0-9+]', '', 'g');
  if digits ~ '^8[0-9]{10}$' then digits := '+7' || substring(digits from 2);
  elsif digits ~ '^7[0-9]{10}$' then digits := '+' || digits;
  elsif digits ~ '^[0-9]{10}$' then digits := '+7' || digits;
  end if;
  if digits ~ '^\+79[0-9]{9}$' then return digits; else return null; end if;
end; $fn$;

-- Бэкап старых значений + починка тестового мусора + нормализация существующих.
alter table public.customers add column if not exists phone_old text;
alter table public.orders add column if not exists phone_old text;
alter table public.trade_in_leads add column if not exists customer_phone_old text;
alter table public.leads add column if not exists contact_phone_old text;
update public.customers set phone_old = phone where phone is not null and phone_old is null;
update public.orders set phone_old = phone where phone is not null and phone_old is null;
update public.trade_in_leads set customer_phone_old = customer_phone where customer_phone is not null and customer_phone_old is null;
update public.leads set contact_phone_old = contact_phone where contact_phone is not null and contact_phone_old is null;
update public.customers set phone = normalize_russian_phone(phone) where phone is not null;
update public.orders set phone = normalize_russian_phone(phone) where phone is not null;
update public.trade_in_leads set customer_phone = normalize_russian_phone(customer_phone) where customer_phone is not null;
update public.leads set contact_phone = normalize_russian_phone(contact_phone) where contact_phone is not null;

-- Триггер нормализации (column name через TG_ARGV) + триггеры на 4 столбца.
create or replace function trg_normalize_phone() returns trigger language plpgsql as $fn$
declare col text := TG_ARGV[0];
begin
  NEW := jsonb_populate_record(NEW, jsonb_build_object(col, normalize_russian_phone(to_jsonb(NEW)->>col)));
  return NEW;
end $fn$;

drop trigger if exists norm_phone on public.customers;
create trigger norm_phone before insert or update of phone on public.customers for each row execute function trg_normalize_phone('phone');
drop trigger if exists norm_phone on public.orders;
create trigger norm_phone before insert or update of phone on public.orders for each row execute function trg_normalize_phone('phone');
drop trigger if exists norm_phone on public.trade_in_leads;
create trigger norm_phone before insert or update of customer_phone on public.trade_in_leads for each row execute function trg_normalize_phone('customer_phone');
drop trigger if exists norm_phone on public.leads;
create trigger norm_phone before insert or update of contact_phone on public.leads for each row execute function trg_normalize_phone('contact_phone');

alter table public.customers add constraint check_phone_format check (phone is null or phone ~ '^\+79[0-9]{9}$');
alter table public.orders add constraint check_customer_phone_format check (phone is null or phone ~ '^\+79[0-9]{9}$');
alter table public.trade_in_leads add constraint check_customer_phone_format check (customer_phone is null or customer_phone ~ '^\+79[0-9]{9}$');
alter table public.leads add constraint check_contact_phone_format check (contact_phone is null or contact_phone ~ '^\+79[0-9]{9}$');
