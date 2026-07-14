begin;

create extension if not exists pgtap with schema extensions;
select plan(26);

select has_table('public', 'categories', 'categories exists');
select has_table('public', 'menu_items', 'menu_items exists');
select has_table('public', 'orders', 'orders exists');
select has_table('public', 'order_items', 'order_items exists');
select is((select count(*) from public.categories), 10::bigint, 'seed has exactly 10 categories');
select is((select count(*) from public.menu_items), 101::bigint, 'seed has exactly 101 menu items');
select is((select count(distinct slug) from public.menu_items), 101::bigint, 'all menu slugs are unique');
select is((select count(*) from public.menu_items where price < 0), 0::bigint, 'all prices are non-negative');
select ok(
  has_function_privilege('anon', 'public.create_order(text,text,text,jsonb,uuid,text,text,text,text)', 'EXECUTE'),
  'anon can execute only the validated order RPC'
);
select ok(not has_table_privilege('anon', 'public.orders', 'SELECT'), 'anon cannot list orders');
select ok(not has_table_privilege('anon', 'public.orders', 'INSERT'), 'anon cannot insert orders directly');
select ok(not has_table_privilege('anon', 'public.order_items', 'INSERT'), 'anon cannot insert order items directly');
select ok(has_table_privilege('anon', 'public.menu_items', 'SELECT'), 'anon can read the public menu through RLS');
select ok(not has_table_privilege('authenticated', 'public.orders', 'SELECT'), 'authenticated non-admin has no direct order grant');

select lives_ok($test$
  select public.create_order(
    'Database Test', '0912345678', 'delivery',
    '[{"slug":"beef-burger","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000001'::uuid,
    'Test Area', 'Test Address'
  )
$test$, 'anon-capable RPC creates a valid order');

select is(
  (select subtotal from public.orders where client_order_token = '00000000-0000-4000-8000-000000000001'),
  820.00::numeric,
  'subtotal uses the database menu price'
);

select lives_ok($test$
  select public.create_order(
    'Database Test', '0912345678', 'delivery',
    '[{"slug":"beef-burger","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000001'::uuid,
    'Test Area', 'Test Address'
  )
$test$, 'matching idempotency retry returns the original order');

select is(
  (select count(*) from public.orders where client_order_token = '00000000-0000-4000-8000-000000000001'),
  1::bigint,
  'idempotency retry does not duplicate the order'
);

update public.menu_items set price = 900 where slug = 'beef-burger';
select is(
  (select unit_price from public.order_items oi join public.orders o on o.id = oi.order_id
   where o.client_order_token = '00000000-0000-4000-8000-000000000001'),
  820.00::numeric,
  'historical unit-price snapshot survives menu price changes'
);

update public.menu_items set is_available = false where slug = 'beef-burger';
select throws_ok($test$
  select public.create_order(
    'Database Test', '0912345678', 'takeaway',
    '[{"slug":"beef-burger","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000002'::uuid
  )
$test$, '22023', 'cart_contains_missing_or_unavailable_items', 'unavailable menu item is rejected');

select throws_ok($test$
  select public.create_order(
    'Database Test', '0912345678', 'takeaway',
    '[{"slug":"not-a-real-item","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000003'::uuid
  )
$test$, '22023', 'cart_contains_missing_or_unavailable_items', 'missing menu item is rejected');

select throws_ok($test$
  select public.create_order(
    'Database Test', '0912345678', 'takeaway',
    '[{"slug":"tea","quantity":0}]'::jsonb,
    '00000000-0000-4000-8000-000000000004'::uuid
  )
$test$, '22023', 'invalid_cart_item', 'zero quantity is rejected');

select throws_ok($test$
  select public.create_order(
    'Different Request', '0912345678', 'delivery',
    '[{"slug":"beef-burger","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000001'::uuid,
    'Test Area', 'Test Address'
  )
$test$, '23505', 'idempotency_token_reused', 'changed input cannot reuse an idempotency token');

select lives_ok($test$
  select public.create_order(
    'Number Test One', '0912345678', 'takeaway',
    '[{"slug":"tea","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000005'::uuid
  )
$test$, 'first order-number test order is created');

select lives_ok($test$
  select public.create_order(
    'Number Test Two', '0912345678', 'takeaway',
    '[{"slug":"tea","quantity":1}]'::jsonb,
    '00000000-0000-4000-8000-000000000006'::uuid
  )
$test$, 'second order-number test order is created');

select is(
  (select count(distinct order_number) from public.orders),
  (select count(*) from public.orders),
  'all generated order numbers are unique'
);

select * from finish();
rollback;
