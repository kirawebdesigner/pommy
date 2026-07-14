\set ON_ERROR_STOP on

begin;

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(p_condition, false) then
    raise exception 'assertion_failed: %', p_message;
  end if;
end;
$$;

select pg_temp.assert_true((select count(*) from public.categories) = 10, 'seed must contain 10 categories');
select pg_temp.assert_true((select count(*) from public.menu_items) = 101, 'seed must contain 101 menu items');
select pg_temp.assert_true((select count(distinct slug) from public.menu_items) = 101, 'menu slugs must be unique');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.orders', 'SELECT'), 'anon must not read orders directly');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.orders', 'INSERT'), 'anon must not insert orders directly');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.orders', 'SELECT'), 'authenticated users must not read orders directly');
select pg_temp.assert_true(has_table_privilege('anon', 'public.menu_items', 'SELECT'), 'anon must read available menu items');

set local role anon;
do $$
begin
  perform count(*) from public.orders;
  raise exception 'assertion_failed: anon listed customer orders';
exception
  when insufficient_privilege then null;
end;
$$;
do $$
begin
  update public.menu_items set price = 1 where slug = 'tea';
  raise exception 'assertion_failed: anon updated the menu';
exception
  when insufficient_privilege then null;
end;
$$;
do $$
begin
  perform public.admin_dashboard();
  raise exception 'assertion_failed: anon executed an admin RPC';
exception
  when insufficient_privilege then null;
end;
$$;
select public.create_order(
  'Database Test',
  '0912345678',
  'delivery',
  '[{"slug":"beef-burger","quantity":1}]'::jsonb,
  '00000000-0000-4000-8000-000000000001'::uuid,
  'Test Area',
  'Test Address'
);
reset role;

select pg_temp.assert_true(
  (select subtotal from public.orders where client_order_token = '00000000-0000-4000-8000-000000000001') = 820.00,
  'order subtotal must use the trusted database price'
);

set local role anon;
select public.create_order(
  'Database Test',
  '0912345678',
  'delivery',
  '[{"slug":"beef-burger","quantity":1}]'::jsonb,
  '00000000-0000-4000-8000-000000000001'::uuid,
  'Test Area',
  'Test Address'
);
reset role;

select pg_temp.assert_true(
  (select count(*) from public.orders where client_order_token = '00000000-0000-4000-8000-000000000001') = 1,
  'matching idempotency retries must not duplicate an order'
);

update public.menu_items set price = 900 where slug = 'beef-burger';
select pg_temp.assert_true(
  (select oi.unit_price
   from public.order_items oi
   join public.orders o on o.id = oi.order_id
   where o.client_order_token = '00000000-0000-4000-8000-000000000001') = 820.00,
  'historical item prices must remain immutable'
);

do $$
begin
  perform public.create_order(
    'Different Request',
    '0912345678',
    'delivery',
    '[{"slug":"beef-burger","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000001'::uuid,
    'Test Area',
    'Test Address'
  );
  raise exception 'assertion_failed: mismatched idempotency reuse was accepted';
exception
  when unique_violation then
    if sqlerrm <> 'idempotency_token_reused' then
      raise;
    end if;
end;
$$;

update public.menu_items set is_available = false where slug = 'beef-burger';
do $$
begin
  perform public.create_order(
    'Unavailable Test',
    '0912345678',
    'takeaway',
    '[{"slug":"beef-burger","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000002'::uuid
  );
  raise exception 'assertion_failed: unavailable item was accepted';
exception
  when invalid_parameter_value then
    if sqlerrm <> 'cart_contains_missing_or_unavailable_items' then
      raise;
    end if;
end;
$$;

set local role anon;
do $$
begin
  perform public.create_order(
    'Missing Item Test',
    '0912345678',
    'takeaway',
    '[{"slug":"not-a-real-item","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000003'::uuid
  );
  raise exception 'assertion_failed: missing item was accepted';
exception
  when invalid_parameter_value then
    if sqlerrm <> 'cart_contains_missing_or_unavailable_items' then
      raise;
    end if;
end;
$$;
do $$
begin
  perform public.create_order(
    'Quantity Test',
    '0912345678',
    'takeaway',
    '[{"slug":"tea","quantity":0}]'::jsonb,
    '00000000-0000-4000-8000-000000000004'::uuid
  );
  raise exception 'assertion_failed: zero quantity was accepted';
exception
  when invalid_parameter_value then
    if sqlerrm <> 'invalid_cart_item' then
      raise;
    end if;
end;
$$;
select public.create_order(
  'Number Test One', '0912345678', 'takeaway',
  '[{"slug":"tea","quantity":1}]'::jsonb,
  '00000000-0000-4000-8000-000000000005'::uuid
);
select public.create_order(
  'Number Test Two', '0912345678', 'takeaway',
  '[{"slug":"tea","quantity":1}]'::jsonb,
  '00000000-0000-4000-8000-000000000006'::uuid
);
reset role;

select pg_temp.assert_true(
  (select count(distinct order_number) from public.orders) = (select count(*) from public.orders),
  'generated order numbers must be unique'
);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'customer@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'admin@example.test');
insert into private.admin_users (user_id) values ('10000000-0000-4000-8000-000000000002');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select pg_temp.assert_true(not public.is_admin(), 'non-allowlisted user must not be an admin');
do $$
begin
  perform public.admin_dashboard();
  raise exception 'assertion_failed: non-admin accessed the dashboard';
exception
  when insufficient_privilege then
    if sqlerrm <> 'admin_access_required' then
      raise;
    end if;
end;
$$;
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select pg_temp.assert_true(public.is_admin(), 'allowlisted user must be an admin');
select pg_temp.assert_true(jsonb_array_length(public.admin_list_menu_items()) = 101, 'admin must receive all menu items');
select pg_temp.assert_true(
  jsonb_array_length(public.admin_list_orders(null, 1, 0, 'Database Test')) = 1,
  'admin order search must filter before pagination'
);
select pg_temp.assert_true((public.admin_dashboard()->'metrics'->>'today_orders')::integer = 3, 'dashboard must include all test orders');
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select id as test_order_id
from public.orders
where client_order_token = '00000000-0000-4000-8000-000000000001'
\gset
set local role authenticated;
select public.admin_update_order_status(
  :'test_order_id'::uuid,
  'preparing'
);
reset role;

select pg_temp.assert_true(
  (select status from public.orders where client_order_token = '00000000-0000-4000-8000-000000000001') = 'preparing',
  'admin status update must persist'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select id as test_menu_item_id
from public.menu_items
where slug = 'tea'
\gset
set local role authenticated;
select public.admin_update_menu_item(
  :'test_menu_item_id'::uuid,
  '{"price":45,"is_featured":true}'::jsonb
);
reset role;

select pg_temp.assert_true(
  (select price = 45 and is_featured from public.menu_items where slug = 'tea'),
  'admin menu patch must update only allowed fields'
);
select pg_temp.assert_true(
  (select slug from public.menu_items where name = 'Tea') = 'tea',
  'admin menu patch must preserve the canonical slug'
);

select 'database behavior tests passed' as result;

rollback;
