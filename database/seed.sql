-- Seed data for StyleHyip
-- Paste this into the Supabase SQL Editor.

insert into public.categories (id, slug, name, description, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'sneakers', 'Sneakers', 'Statement sneakers and casual staples.', true),
  ('22222222-2222-2222-2222-222222222222', 'bags', 'Bags', 'Elevated accessories for everyday dressing.', true),
  ('33333333-3333-3333-3333-333333333333', 'streetwear', 'Streetwear', 'Relaxed layering pieces with attitude.', true)
on conflict (slug) do nothing;

insert into public.products (id, slug, name, description, price, stock, category_id, image_url, is_featured, is_active) values
  ('44444444-4444-4444-4444-444444444444', 'nova-runner', 'Nova Runner', 'Lightweight silhouette with sculpted cushioning.', 6800, 14, '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', true, true),
  ('55555555-5555-5555-5555-555555555555', 'nairobi-tote', 'Nairobi Tote', 'Soft vegan leather tote designed for everyday commute.', 5400, 9, '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', true, true),
  ('66666666-6666-6666-6666-666666666666', 'urban-oxford', 'Urban Oxford', 'Polished lace-up with refined detailing.', 7200, 8, '33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80', true, true),
  ('77777777-7777-7777-7777-777777777777', 'harbor-jacket', 'Harbor Jacket', 'Structured layer with everyday comfort.', 8900, 5, '33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80', false, true)
on conflict (slug) do nothing;

insert into public.inventory (id, product_id, stock, low_stock_threshold) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 14, 5),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 9, 4),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666', 8, 4),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '77777777-7777-7777-7777-777777777777', 5, 3)
on conflict (product_id) do nothing;

insert into public.reviews (id, product_id, user_id, rating, comment) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '44444444-4444-4444-4444-444444444444', null, 5, 'Excellent quality and fast delivery.'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '55555555-5555-5555-5555-555555555555', null, 4, 'Great everyday bag.'),
  ('10101010-1010-1010-1010-101010101010', '66666666-6666-6666-6666-666666666666', null, 5, 'Very polished and comfortable.')
on conflict (id) do nothing;

insert into public.customers (id, email, phone, full_name) values
  ('12121212-1212-1212-1212-121212121212', 'maria@stylehyip.com', '+254700000001', 'Maria Wanjiku'),
  ('13131313-1313-1313-1313-131313131313', 'daniel@stylehyip.com', '+254700000002', 'Daniel Otieno')
on conflict (id) do nothing;

insert into public.orders (id, user_id, status, total, delivery_address, phone) values
  ('14141414-1414-1414-1414-141414141414', null, 'paid', 13600, 'Nairobi, Kenya', '+254700000001'),
  ('15151515-1515-1515-1515-151515151515', null, 'processing', 5400, 'Mombasa, Kenya', '+254700000002')
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, quantity, unit_price) values
  ('16161616-1616-1616-1616-161616161616', '14141414-1414-1414-1414-141414141414', '44444444-4444-4444-4444-444444444444', 1, 6800),
  ('17171717-1717-1717-1717-171717171717', '14141414-1414-1414-1414-141414141414', '55555555-5555-5555-5555-555555555555', 1, 6800),
  ('18181818-1818-1818-1818-181818181818', '15151515-1515-1515-1515-151515151515', '55555555-5555-5555-5555-555555555555', 1, 5400)
on conflict (id) do nothing;

insert into public.payments (id, order_id, provider, status, reference, amount) values
  ('19191919-1919-1919-1919-191919191919', '14141414-1414-1414-1414-141414141414', 'mpesa', 'paid', 'MPESA-1001', 13600),
  ('20202020-2020-2020-2020-202020202020', '15151515-1515-1515-1515-151515151515', 'mpesa', 'pending', 'MPESA-1002', 5400)
on conflict (id) do nothing;

insert into public.site_settings (key, value) values
  ('store_name', 'Step Into Style'),
  ('store_tagline', 'Fashion for every city in Kenya'),
  ('currency', 'KES')
on conflict (key) do nothing;
