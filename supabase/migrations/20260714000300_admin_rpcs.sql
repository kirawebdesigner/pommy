begin;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on update cascade on delete cascade,
  created_at timestamptz not null default now()
);

comment on table private.admin_users is 'Trusted admin allowlist. Add rows only through the Supabase dashboard or another service-role environment.';

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

create function private.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception using errcode = '42501', message = 'admin_access_required';
  end if;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin();
$$;

create function private.admin_order_json(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'customer_name', o.customer_name,
    'phone', o.phone,
    'order_type', o.order_type,
    'delivery_area', o.delivery_area,
    'address', o.address,
    'landmark', o.landmark,
    'notes', o.notes,
    'subtotal', o.subtotal,
    'payment_method', o.payment_method,
    'status', o.status,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'menu_item_id', oi.menu_item_id,
        'product_name', oi.product_name,
        'unit_price', oi.unit_price,
        'quantity', oi.quantity,
        'line_total', oi.line_total,
        'created_at', oi.created_at
      ) order by oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

create function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_start_of_today timestamptz := date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi';
  v_result jsonb;
begin
  perform private.assert_admin();

  select jsonb_build_object(
    'metrics', jsonb_build_object(
      'new_orders', count(*) filter (where status = 'new'),
      'preparing', count(*) filter (where status = 'preparing'),
      'ready', count(*) filter (where status = 'ready'),
      'today_orders', count(*) filter (where created_at >= v_start_of_today),
      'completed_today', count(*) filter (where status = 'completed' and created_at >= v_start_of_today)
    ),
    'recent_orders', coalesce((
      select jsonb_agg(row_data order by row_data.created_at desc)
      from (
        select o.id, o.order_number, o.customer_name, o.phone, o.order_type,
               o.subtotal, o.status, o.created_at
        from public.orders o
        order by o.created_at desc
        limit 20
      ) row_data
    ), '[]'::jsonb)
  )
  into v_result
  from public.orders;

  return v_result;
end;
$$;

create function public.admin_list_orders(
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.assert_admin();

  if p_status is not null and p_status not in ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled') then
    raise exception using errcode = '22023', message = 'invalid_order_status';
  end if;
  if p_limit not between 1 and 200 or p_offset < 0 then
    raise exception using errcode = '22023', message = 'invalid_pagination';
  end if;
  if p_search is not null and length(p_search) > 120 then
    raise exception using errcode = '22023', message = 'invalid_order_search';
  end if;

  select coalesce(jsonb_agg(private.admin_order_json(filtered.id) order by filtered.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select o.id, o.created_at
    from public.orders o
    where (p_status is null or o.status = p_status)
      and (
        nullif(btrim(p_search), '') is null
        or position(lower(btrim(p_search)) in lower(concat_ws(' ', o.id::text, o.order_number, o.customer_name, o.phone))) > 0
      )
    order by o.created_at desc
    limit p_limit offset p_offset
  ) filtered;

  return v_result;
end;
$$;

create function public.admin_get_order(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.assert_admin();
  v_result := private.admin_order_json(p_order_id);
  if v_result is null then
    raise exception using errcode = 'P0002', message = 'order_not_found';
  end if;
  return v_result;
end;
$$;

create function public.admin_update_order_status(p_order_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  if p_status not in ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled') then
    raise exception using errcode = '22023', message = 'invalid_order_status';
  end if;

  update public.orders set status = p_status where id = p_order_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'order_not_found';
  end if;

  return private.admin_order_json(p_order_id);
end;
$$;

create function public.admin_list_menu_items()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.assert_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'category_id', m.category_id,
    'category_name', c.name,
    'name', m.name,
    'slug', m.slug,
    'description', m.description,
    'price', m.price,
    'image_url', m.image_url,
    'is_available', m.is_available,
    'is_featured', m.is_featured,
    'sort_order', m.sort_order,
    'created_at', m.created_at,
    'updated_at', m.updated_at
  ) order by c.sort_order, m.sort_order, m.slug), '[]'::jsonb)
  into v_result
  from public.menu_items m
  join public.categories c on c.id = m.category_id;
  return v_result;
end;
$$;

create function public.admin_list_categories()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.assert_admin();
  select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.slug), '[]'::jsonb)
  into v_result
  from public.categories c;
  return v_result;
end;
$$;

create function public.admin_update_menu_item(p_menu_item_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.assert_admin();
  if p_patch is null or jsonb_typeof(p_patch) <> 'object'
    or p_patch - array['name', 'description', 'price', 'image_url', 'is_available', 'is_featured', 'category_id', 'sort_order'] <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'invalid_menu_patch';
  end if;

  update public.menu_items m set
    name = case when p_patch ? 'name' then p_patch->>'name' else m.name end,
    description = case when p_patch ? 'description' then nullif(p_patch->>'description', '') else m.description end,
    price = case when p_patch ? 'price' then (p_patch->>'price')::numeric else m.price end,
    image_url = case when p_patch ? 'image_url' then nullif(p_patch->>'image_url', '') else m.image_url end,
    is_available = case when p_patch ? 'is_available' then (p_patch->>'is_available')::boolean else m.is_available end,
    is_featured = case when p_patch ? 'is_featured' then (p_patch->>'is_featured')::boolean else m.is_featured end,
    category_id = case when p_patch ? 'category_id' then (p_patch->>'category_id')::uuid else m.category_id end,
    sort_order = case when p_patch ? 'sort_order' then (p_patch->>'sort_order')::integer else m.sort_order end
  where m.id = p_menu_item_id
  returning to_jsonb(m) into v_result;

  if v_result is null then
    raise exception using errcode = 'P0002', message = 'menu_item_not_found';
  end if;
  return v_result;
end;
$$;

create function public.admin_update_category(p_category_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform private.assert_admin();
  if p_patch is null or jsonb_typeof(p_patch) <> 'object'
    or p_patch - array['name', 'description', 'sort_order', 'is_active'] <> '{}'::jsonb then
    raise exception using errcode = '22023', message = 'invalid_category_patch';
  end if;

  update public.categories c set
    name = case when p_patch ? 'name' then p_patch->>'name' else c.name end,
    description = case when p_patch ? 'description' then nullif(p_patch->>'description', '') else c.description end,
    sort_order = case when p_patch ? 'sort_order' then (p_patch->>'sort_order')::integer else c.sort_order end,
    is_active = case when p_patch ? 'is_active' then (p_patch->>'is_active')::boolean else c.is_active end
  where c.id = p_category_id
  returning to_jsonb(c) into v_result;

  if v_result is null then
    raise exception using errcode = 'P0002', message = 'category_not_found';
  end if;
  return v_result;
end;
$$;

revoke execute on all functions in schema private from public;
revoke execute on all functions in schema public from public;

commit;
