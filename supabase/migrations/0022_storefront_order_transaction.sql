-- 0022: атомарное оформление заказа витрины.
--
-- Заголовок заказа, строки, финальная проверка лимитов промокода,
-- инкремент счётчика и журнал использования записываются одной транзакцией.
-- Это закрывает гонки двух одновременных заказов одного покупателя.

begin;

create or replace function public.create_storefront_order(
  p_order jsonb,
  p_items jsonb,
  p_promo_code text default null,
  p_promo_had_effect boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_order_id text;
  v_order_number text;
  v_phone text;
  v_customer_id uuid;
  v_customer_email text;
  v_subtotal integer;
  v_discount_cash integer;
  v_discount_promo integer;
  v_surcharge integer;
  v_delivery_cost integer;
  v_total integer;
  v_price_base text;
  v_promo_code text;
  v_promo public.promo_codes%rowtype;
  v_product public.products%rowtype;
  v_availability_settings jsonb;
  v_allow_zero_stock boolean;
  v_customer_uses integer := 0;
  v_eligible_base integer := 0;
  v_expected_discount integer := 0;
  v_expected_discount_cash integer := 0;
  v_item record;
  v_item_count integer := 0;
  v_items_total integer := 0;
  v_applied_price integer;
  v_line_total integer;
  v_authoritative_items jsonb := '[]'::jsonb;
  v_existing_order record;
  v_year integer;
  v_sequence integer;
  v_insert_attempt integer := 0;
begin
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception using errcode = 'P0001', message = 'ORDER_PAYLOAD_INVALID';
  end if;
  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 50 then
    raise exception using errcode = 'P0001', message = 'ORDER_ITEMS_INVALID';
  end if;

  v_order_id := nullif(btrim(p_order ->> 'id'), '');
  v_phone := public.normalize_russian_phone(p_order ->> 'phone');
  v_customer_id := nullif(p_order ->> 'customer_id', '')::uuid;
  v_customer_email := nullif(btrim(p_order ->> 'customer_email'), '');
  v_subtotal := coalesce((p_order ->> 'subtotal')::integer, 0);
  v_discount_cash := coalesce((p_order ->> 'discount_cash')::integer, 0);
  v_discount_promo := coalesce((p_order ->> 'discount_promo')::integer, 0);
  v_surcharge := coalesce((p_order ->> 'surcharge')::integer, 0);
  v_delivery_cost := coalesce((p_order ->> 'delivery_cost')::integer, 0);
  v_total := coalesce((p_order ->> 'total')::integer, 0);
  v_price_base := nullif(p_order ->> 'price_base', '');
  v_promo_code := nullif(upper(btrim(coalesce(p_promo_code, p_order ->> 'promo_code'))), '');

  if v_order_id is null or v_phone is null then
    raise exception using errcode = 'P0001', message = 'ORDER_PAYLOAD_INVALID';
  end if;
  if coalesce(nullif(p_order ->> 'customer_type', ''), 'individual') not in ('individual', 'legal')
    or v_price_base is null
    or v_price_base not in ('cash', 'card')
    or nullif(btrim(p_order ->> 'customer_name'), '') is null
    or nullif(btrim(p_order ->> 'delivery_method'), '') is null
    or nullif(btrim(p_order ->> 'payment_method'), '') is null then
    raise exception using errcode = 'P0001', message = 'ORDER_PAYLOAD_INVALID';
  end if;
  if v_subtotal < 0
    or v_discount_cash < 0
    or v_discount_promo < 0
    or v_surcharge < 0
    or v_delivery_cost < 0
    or v_total < 0 then
    raise exception using errcode = 'P0001', message = 'ORDER_TOTALS_INVALID';
  end if;
  if v_total <> greatest(
    0,
    v_subtotal + v_surcharge + v_delivery_cost - v_discount_promo
  ) then
    raise exception using errcode = 'P0001', message = 'ORDER_TOTALS_INVALID';
  end if;
  if p_promo_had_effect and v_promo_code is null then
    raise exception using errcode = 'P0001', message = 'PROMO_INVALID';
  end if;
  if not p_promo_had_effect and v_discount_promo > 0 then
    raise exception using errcode = 'P0001', message = 'PROMO_CHANGED';
  end if;

  -- Все storefront-заказы одного телефона проходят последовательно. Иначе два
  -- одновременных первых заказа с разными промокодами могли оба пройти
  -- only_new_customers до появления первой записи в orders.
  perform pg_advisory_xact_lock(hashtextextended('phonetrade_customer_' || v_phone, 0));

  -- Повтор с тем же attempt UUID возвращает уже созданный заказ. Телефон
  -- проверяем, чтобы idempotency key нельзя было использовать для чужого заказа.
  select existing_order.order_number, existing_order.total, existing_order.customer_id,
         existing_order.phone
    into v_existing_order
    from public.orders as existing_order
   where existing_order.id = v_order_id;
  if found then
    if v_existing_order.phone <> v_phone then
      raise exception using errcode = 'P0001', message = 'ORDER_ID_CONFLICT';
    end if;
    return jsonb_build_object(
      'order_id', v_order_id,
      'order_number', coalesce(v_existing_order.order_number, v_order_id),
      'total', v_existing_order.total,
      'customer_id', v_existing_order.customer_id,
      'promo_reserved', false,
      'replayed', true
    );
  end if;

  select setting.value
    into v_availability_settings
    from public.shop_settings as setting
   where setting.key = 'product_availability'
   for share;
  if not found then
    raise exception using errcode = 'P0001', message = 'AVAILABILITY_SETTINGS_UNAVAILABLE';
  end if;
  v_allow_zero_stock := coalesce(
    (v_availability_settings ->> 'allow_zero_stock')::boolean,
    true
  );

  if (
    select count(distinct item ->> 'product_id')
      from jsonb_array_elements(p_items) as item
  ) <> jsonb_array_length(p_items) then
    raise exception using errcode = 'P0001', message = 'ORDER_ITEMS_INVALID';
  end if;

  -- Цены и остаток проверяются под row-lock внутри той же транзакции, в которой
  -- создаётся заказ. В hard-stock режиме точный остаток сразу уменьшается.
  for v_item in
    select *
      from jsonb_to_recordset(p_items) as item(product_id text, qty integer)
     order by product_id
  loop
    if nullif(btrim(v_item.product_id), '') is null
      or v_item.qty is null
      or v_item.qty < 1
      or v_item.qty > 10 then
      raise exception using errcode = 'P0001', message = 'ORDER_ITEMS_INVALID';
    end if;

    select *
      into v_product
      from public.products as product
     where product.id = v_item.product_id
       and product.status = 'published'
       and product.deleted_at is null
     for update;
    if not found or v_product.is_available is false then
      raise exception using errcode = 'P0001', message = 'PRODUCT_UNAVAILABLE';
    end if;

    if not v_allow_zero_stock then
      if v_product.stock is not null then
        if v_product.stock < v_item.qty then
          raise exception using errcode = 'P0001', message = 'STOCK_CHANGED';
        end if;
        update public.products
           set stock = stock - v_item.qty,
               in_stock = (stock - v_item.qty) > 0,
               updated_at = now()
         where id = v_product.id;
      elsif v_product.in_stock is not true then
        raise exception using errcode = 'P0001', message = 'STOCK_CHANGED';
      end if;
    end if;

    if v_product.price_cash is null
      or v_product.price_cash < 0
      or v_product.price_card is null
      or v_product.price_card < 0 then
      raise exception using errcode = 'P0001', message = 'PRICE_CHANGED';
    end if;
    v_applied_price := case
      when v_price_base = 'card' then v_product.price_card
      else v_product.price_cash
    end;
    v_line_total := v_applied_price * v_item.qty;
    v_items_total := v_items_total + v_line_total;
    if v_price_base = 'cash' then
      v_expected_discount_cash := v_expected_discount_cash +
        greatest(0, v_product.price_card - v_product.price_cash) * v_item.qty;
    end if;
    v_item_count := v_item_count + 1;
    v_authoritative_items := v_authoritative_items || jsonb_build_array(
      jsonb_build_object(
        'product_id', v_product.id,
        'category_slug', v_product.category_slug,
        'title', v_product.title,
        'sku', v_product.sku,
        'image', v_product.image,
        'qty', v_item.qty,
        'price_cash', v_product.price_cash,
        'price_card', v_product.price_card,
        'applied_price', v_applied_price,
        'total', v_line_total
      )
    );
  end loop;

  if v_item_count <> jsonb_array_length(p_items) then
    raise exception using errcode = 'P0001', message = 'ORDER_ITEMS_INVALID';
  end if;
  if v_items_total <> v_subtotal then
    raise exception using errcode = 'P0001', message = 'PRICE_CHANGED';
  end if;
  if v_expected_discount_cash <> v_discount_cash then
    raise exception using errcode = 'P0001', message = 'PRICE_CHANGED';
  end if;

  -- Блокировка строки промокода сериализует параллельные оформления с одним
  -- кодом. Все проверки ниже и запись usage войдут в ту же транзакцию.
  if p_promo_had_effect then
    select *
      into v_promo
      from public.promo_codes
     where code = v_promo_code
       and deleted_at is null
     for update;

    if not found or not v_promo.is_active then
      raise exception using errcode = 'P0001', message = 'PROMO_INVALID';
    end if;
    if v_promo.starts_at is not null and v_promo.starts_at > now() then
      raise exception using errcode = 'P0001', message = 'PROMO_NOT_STARTED';
    end if;
    if v_promo.expires_at is not null and v_promo.expires_at < now() then
      raise exception using errcode = 'P0001', message = 'PROMO_EXPIRED';
    end if;
    if v_promo.total_limit is not null and v_promo.used_count >= v_promo.total_limit then
      raise exception using errcode = 'P0001', message = 'PROMO_TOTAL_LIMIT';
    end if;
    if v_subtotal < coalesce(v_promo.min_order_amount, 0) then
      raise exception using errcode = 'P0001', message = 'PROMO_CHANGED';
    end if;

    -- Проверяем область действия и размер скидки ещё раз уже под блокировкой.
    if v_promo.applies_to = 'all' then
      select coalesce(sum((item ->> 'total')::integer), 0)
        into v_eligible_base
        from jsonb_array_elements(v_authoritative_items) as item;
    elsif v_promo.applies_to = 'products' then
      select coalesce(sum((item ->> 'total')::integer), 0)
        into v_eligible_base
        from jsonb_array_elements(v_authoritative_items) as item
       where item ->> 'product_id' = any(v_promo.applies_to_ids);
    elsif v_promo.applies_to = 'categories' then
      with recursive eligible_categories(slug) as (
        select unnest(v_promo.applies_to_ids)
        union
        select category.slug
          from public.categories as category
          join eligible_categories as parent on category.parent_slug = parent.slug
      )
      select coalesce(sum((item ->> 'total')::integer), 0)
        into v_eligible_base
        from jsonb_array_elements(v_authoritative_items) as item
       where item ->> 'category_slug' in (select slug from eligible_categories);
    end if;

    if v_eligible_base <= 0 then
      raise exception using errcode = 'P0001', message = 'PROMO_CHANGED';
    end if;

    if v_promo.discount_type = 'percent' then
      v_expected_discount := greatest(
        0,
        round(v_eligible_base::numeric * v_promo.discount_value::numeric / 100)::integer
      );
    elsif v_promo.discount_type = 'fixed' then
      v_expected_discount := greatest(0, least(v_promo.discount_value, v_eligible_base));
    elsif v_promo.discount_type = 'free_shipping' then
      v_expected_discount := 0;
    else
      raise exception using errcode = 'P0001', message = 'PROMO_CHANGED';
    end if;

    if v_expected_discount <> v_discount_promo then
      raise exception using errcode = 'P0001', message = 'PROMO_CHANGED';
    end if;

    if v_promo.only_new_customers and exists (
      select 1
        from public.orders as existing_order
       where existing_order.phone = v_phone
         and existing_order.status <> 'cancelled'
         and existing_order.deleted_at is null
    ) then
      raise exception using errcode = 'P0001', message = 'PROMO_ONLY_NEW';
    end if;

    if coalesce(v_promo.per_customer_limit, 0) > 0 then
      select count(*)::integer
        into v_customer_uses
        from public.promo_code_usages as usage
        left join public.orders as used_order on used_order.id = usage.order_id
       where usage.promo_code_id = v_promo.id
         and (
           used_order.phone = v_phone
           or (v_customer_id is not null and usage.customer_id = v_customer_id)
           or (
             v_customer_email is not null
             and lower(coalesce(usage.customer_email_snapshot, '')) = lower(v_customer_email)
           )
         );
      if v_customer_uses >= v_promo.per_customer_limit then
        raise exception using errcode = 'P0001', message = 'PROMO_CUSTOMER_LIMIT';
      end if;
    end if;
  end if;

  -- Реестр и статистика клиента входят в ту же транзакцию. Replay выше не
  -- вызывает upsert повторно и поэтому не удваивает total_orders/total_spent.
  v_customer_id := public.upsert_customer(
    v_phone,
    nullif(btrim(p_order ->> 'customer_name'), ''),
    v_customer_email,
    nullif(p_order ->> 'user_id', '')::uuid,
    v_total
  );

  -- Номер генерируется в БД под advisory-lock: два одновременных заказа не
  -- получат один PT-YYYY-NNNN. UUID остаётся переданным приложением id заказа.
  v_year := extract(year from now())::integer;
  perform pg_advisory_xact_lock(hashtextextended('phonetrade_order_number_' || v_year::text, 0));
  select coalesce(max(substring(order_number from 9)::integer), 0) + 1
    into v_sequence
    from public.orders
   where order_number ~ ('^PT-' || v_year::text || '-[0-9]+$');

  loop
    v_insert_attempt := v_insert_attempt + 1;
    v_order_number := 'PT-' || v_year::text || '-' ||
      case
        when length(v_sequence::text) < 4 then lpad(v_sequence::text, 4, '0')
        else v_sequence::text
      end;

    begin
      insert into public.orders (
        id,
        order_number,
        customer_id,
        user_id,
        customer_type,
        customer_name,
        customer_email,
        phone,
        delivery_method,
        delivery_address,
        delivery_cost,
        payment_method,
        payment_status,
        status,
        subtotal,
        discount_cash,
        discount_promo,
        total,
        promo_code,
        manager_notes,
        created_at,
        updated_at
      ) values (
        v_order_id,
        v_order_number,
        v_customer_id,
        nullif(p_order ->> 'user_id', '')::uuid,
        coalesce(nullif(p_order ->> 'customer_type', ''), 'individual'),
        nullif(btrim(p_order ->> 'customer_name'), ''),
        v_customer_email,
        v_phone,
        nullif(btrim(p_order ->> 'delivery_method'), ''),
        nullif(btrim(p_order ->> 'delivery_address'), ''),
        v_delivery_cost,
        nullif(btrim(p_order ->> 'payment_method'), ''),
        'pending',
        'new',
        v_subtotal,
        v_discount_cash,
        v_discount_promo,
        v_total,
        v_promo_code,
        nullif(p_order ->> 'manager_notes', ''),
        now(),
        now()
      );
      exit;
    exception
      when unique_violation then
        if exists (select 1 from public.orders where id = v_order_id)
          or v_insert_attempt >= 20 then
          raise exception using errcode = 'P0001', message = 'ORDER_ID_CONFLICT';
        end if;
        v_sequence := v_sequence + 1;
    end;
  end loop;

  for v_item in
    select *
      from jsonb_to_recordset(v_authoritative_items) as item(
        product_id text,
        category_slug text,
        title text,
        sku text,
        image text,
        qty integer,
        price_cash integer,
        price_card integer,
        applied_price integer,
        total integer
      )
  loop
    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      title,
      sku,
      image,
      qty,
      price_cash,
      price_card,
      applied_price,
      total
    ) values (
      v_order_id,
      v_item.product_id,
      null,
      v_item.title,
      v_item.sku,
      coalesce(v_item.image, ''),
      v_item.qty,
      v_item.price_cash,
      v_item.price_card,
      v_item.applied_price,
      v_item.total
    );
  end loop;

  insert into public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by,
    comment
  ) values (
    v_order_id,
    null,
    'new',
    null,
    'Заказ оформлен на сайте'
  );

  if p_promo_had_effect then
    update public.promo_codes
       set used_count = used_count + 1
     where id = v_promo.id;

    insert into public.promo_code_usages (
      promo_code_id,
      promo_code_snapshot,
      promo_type_snapshot,
      promo_value_snapshot,
      order_id,
      order_number_snapshot,
      customer_id,
      customer_email_snapshot,
      cart_subtotal_rub,
      discount_amount_rub,
      final_amount_rub,
      source,
      order_status_at_use
    ) values (
      v_promo.id,
      v_promo.code,
      v_promo.discount_type,
      v_promo.discount_value,
      v_order_id,
      v_order_number,
      v_customer_id,
      v_customer_email,
      v_subtotal,
      v_discount_promo,
      v_total,
      'checkout',
      'new'
    );
  end if;

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_total,
    'customer_id', v_customer_id,
    'promo_reserved', p_promo_had_effect,
    'replayed', false
  );
end;
$fn$;

revoke all on function public.create_storefront_order(jsonb, jsonb, text, boolean) from public;
revoke all on function public.create_storefront_order(jsonb, jsonb, text, boolean) from anon;
revoke all on function public.create_storefront_order(jsonb, jsonb, text, boolean) from authenticated;
grant execute on function public.create_storefront_order(jsonb, jsonb, text, boolean) to service_role;

-- PostgREST должен увидеть новую RPC до переключения приложения на релиз.
notify pgrst, 'reload schema';

commit;
