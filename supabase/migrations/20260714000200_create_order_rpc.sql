begin;

create function private.order_response(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'order_type', o.order_type,
    'subtotal', o.subtotal,
    'payment_method', o.payment_method,
    'status', o.status,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'menu_item_id', oi.menu_item_id,
        'product_name', oi.product_name,
        'unit_price', oi.unit_price,
        'quantity', oi.quantity,
        'line_total', oi.line_total
      ) order by oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

create function public.create_order(
  p_customer_name text,
  p_phone text,
  p_order_type text,
  p_items jsonb,
  p_client_order_token uuid,
  p_delivery_area text default null,
  p_address text default null,
  p_landmark text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_name text := btrim(coalesce(p_customer_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[[:space:]()-]', '', 'g');
  v_order_type text := lower(btrim(coalesce(p_order_type, '')));
  v_delivery_area text := nullif(btrim(coalesce(p_delivery_area, '')), '');
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
  v_landmark text := nullif(btrim(coalesce(p_landmark, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_items jsonb;
  v_payload jsonb;
  v_request_hash bytea;
  v_existing_hash bytea;
  v_order_id uuid;
  v_subtotal numeric(12, 2) := 0;
  v_resolved_count integer := 0;
  v_line record;
begin
  if v_phone ~ '^2519[0-9]{8}$' then
    v_phone := '+' || v_phone;
  end if;

  if v_order_type = 'pickup' then
    v_order_type := 'takeaway';
  end if;

  if length(v_customer_name) not between 1 and 120 then
    raise exception using errcode = '22023', message = 'invalid_customer_name';
  end if;
  if v_phone !~ '^(09[0-9]{8}|\+2519[0-9]{8})$' then
    raise exception using errcode = '22023', message = 'invalid_phone';
  end if;
  if v_order_type not in ('delivery', 'takeaway') then
    raise exception using errcode = '22023', message = 'invalid_order_type';
  end if;
  if p_client_order_token is null then
    raise exception using errcode = '22023', message = 'missing_client_order_token';
  end if;
  if v_order_type = 'delivery' and (v_delivery_area is null or v_address is null) then
    raise exception using errcode = '22023', message = 'missing_delivery_fields';
  end if;
  if length(coalesce(v_delivery_area, '')) > 120
    or length(coalesce(v_address, '')) > 500
    or length(coalesce(v_landmark, '')) > 200
    or length(coalesce(v_notes, '')) > 1000 then
    raise exception using errcode = '22023', message = 'customer_field_too_long';
  end if;

  if v_order_type = 'takeaway' then
    v_delivery_area := null;
    v_address := null;
    v_landmark := null;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'invalid_cart';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    where jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item->'slug') <> 'string'
      or coalesce(item->>'slug', '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or jsonb_typeof(item->'quantity') <> 'number'
      or coalesce(item->>'quantity', '') !~ '^[1-9][0-9]*$'
      or (item->>'quantity')::numeric > 99
  ) then
    raise exception using errcode = '22023', message = 'invalid_cart_item';
  end if;

  select jsonb_agg(jsonb_build_object('slug', normalized.slug, 'quantity', normalized.quantity) order by normalized.slug)
  into v_items
  from (
    select item->>'slug' as slug, sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) item
    group by item->>'slug'
  ) normalized;

  if exists (
    select 1 from jsonb_to_recordset(v_items) as item(slug text, quantity integer) where item.quantity > 99
  ) then
    raise exception using errcode = '22023', message = 'invalid_cart_quantity';
  end if;

  v_payload := jsonb_build_object(
    'customer_name', v_customer_name,
    'phone', v_phone,
    'order_type', v_order_type,
    'delivery_area', v_delivery_area,
    'address', v_address,
    'landmark', v_landmark,
    'notes', v_notes,
    'items', v_items
  );
  v_request_hash := extensions.digest(convert_to(v_payload::text, 'UTF8'), 'sha256');

  select o.id, o.request_hash
  into v_order_id, v_existing_hash
  from public.orders o
  where o.client_order_token = p_client_order_token;

  if found then
    if v_existing_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_token_reused';
    end if;
    return private.order_response(v_order_id);
  end if;

  for v_line in
    select m.id, m.name, m.price, requested.quantity
    from jsonb_to_recordset(v_items) as requested(slug text, quantity integer)
    join public.menu_items m on m.slug = requested.slug
    join public.categories c on c.id = m.category_id
    where m.is_available and c.is_active
    order by m.slug
    for share of m, c
  loop
    v_resolved_count := v_resolved_count + 1;
    v_subtotal := v_subtotal + (v_line.price * v_line.quantity);
  end loop;

  if v_resolved_count <> jsonb_array_length(v_items) then
    raise exception using errcode = '22023', message = 'cart_contains_missing_or_unavailable_items';
  end if;

  begin
    insert into public.orders (
      client_order_token, request_hash, customer_name, phone, order_type,
      delivery_area, address, landmark, notes, subtotal
    ) values (
      p_client_order_token, v_request_hash, v_customer_name, v_phone, v_order_type,
      v_delivery_area, v_address, v_landmark, v_notes, v_subtotal
    )
    returning id into v_order_id;
  exception when unique_violation then
    select o.id, o.request_hash
    into v_order_id, v_existing_hash
    from public.orders o
    where o.client_order_token = p_client_order_token;

    if v_order_id is null or v_existing_hash <> v_request_hash then
      raise exception using errcode = '23505', message = 'idempotency_token_reused';
    end if;
    return private.order_response(v_order_id);
  end;

  insert into public.order_items (order_id, menu_item_id, product_name, unit_price, quantity)
  select v_order_id, m.id, m.name, m.price, requested.quantity
  from jsonb_to_recordset(v_items) as requested(slug text, quantity integer)
  join public.menu_items m on m.slug = requested.slug;

  return private.order_response(v_order_id);
end;
$$;

comment on function public.create_order(text, text, text, jsonb, uuid, text, text, text, text)
is 'Creates a COD order atomically from trusted live menu prices. Repeated matching client tokens return the original order.';

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema public from public;

commit;
