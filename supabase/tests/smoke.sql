-- EVENTUS — end-to-end check of the migrations, run as real roles (anon / authenticated / service).
-- Runs inside a transaction and rolls back: nothing stays in the database.
--   supabase MCP: execute_sql with this file;  CLI: psql "$DB_URL" -f supabase/tests/smoke.sql
-- A failed check aborts with "FAIL: …"; success ends with the notice "smoke: all checks passed".
begin;

do $$
declare
  c1 uuid := gen_random_uuid();  -- client
  c2 uuid := gen_random_uuid();  -- client
  c3 uuid := gen_random_uuid();  -- client
  vo uuid := gen_random_uuid();  -- becomes a vendor
  ad uuid := gen_random_uuid();  -- admin
  res jsonb; vid uuid; oid uuid; pid uuid; b1 uuid; b2 uuid; conv uuid; st text; n int; ok boolean;
  d1 date := current_date + 30;
  d2 date := current_date + 31;
begin
  -- internal and webhook-only functions are not reachable through /rest/v1/rpc
  assert not has_function_privilege('anon', 'public._release(public.bookings)', 'execute'), 'FAIL: anon can call _release';
  assert not has_function_privilege('authenticated', 'public._release(public.bookings)', 'execute'), 'FAIL: user can call _release';
  assert not has_function_privilege('authenticated', 'public.confirm_booking_payment(uuid, text)', 'execute'), 'FAIL: user can mark paid';
  assert not has_function_privilege('authenticated', 'public.auto_release_due_deals()', 'execute'), 'FAIL: user can run auto-release';
  assert not has_function_privilege('anon', 'public.create_booking(uuid, date, int, uuid, text)', 'execute'), 'FAIL: anon can book';
  assert has_function_privilege('anon', 'public.offer_availability(uuid, date, date)', 'execute'), 'FAIL: anon availability';

  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
    (c1, 'c1@test.kg', '{"full_name":"Айгерим"}', '{"provider":"email"}'),
    (c2, 'c2@test.kg', '{}', '{"provider":"google"}'),
    (c3, 'c3@test.kg', '{}', '{"provider":"email"}'),
    (vo, 'vo@test.kg', '{"name":"Бакыт"}', '{"provider":"email"}'),
    (ad, 'ad@test.kg', '{}', '{"provider":"email"}');
  update public.profiles set role = 'admin' where id = ad;
  assert (select name from public.profiles where id = c1) = 'Айгерим', 'FAIL: profile trigger name';
  assert (select auth_provider from public.profiles where id = c2) = 'google', 'FAIL: profile trigger provider';

  -- ── vendor sign-up, one transaction ──
  perform set_config('request.jwt.claims', json_build_object('sub', vo, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  res := public.sign_up_vendor('{"ownerName":"Бакыт","name":"Алтын Кортеж","category":"cars","city":"bishkek","tagline":"Кортежи","phone":"+996555",
    "specs":{},"photos":["https://x/1.jpg"],"offer":{"title":"Mercedes","price":10000,"unit":{"ru":"авто","en":"car"}}}');
  vid := (res ->> 'vendor_id')::uuid; oid := (res ->> 'offer_id')::uuid; pid := (res ->> 'post_id')::uuid;
  assert (select role from public.profiles where id = vo) = 'vendor', 'FAIL: sign-up role';
  -- retry reuses the vendor
  res := public.sign_up_vendor('{"name":"Алтын Кортеж","category":"cars","tagline":"x","photos":[],"offer":{"title":"B","price":1,"unit":{"ru":"a","en":"a"}}}');
  assert (res ->> 'vendor_id')::uuid = vid, 'FAIL: sign-up retry made a second vendor';
  assert (select count(*) from public.offers where vendor_id = vid) = 1, 'FAIL: sign-up retry duplicated the offer';
  assert (select cardinality(portfolio) from public.vendors where id = vid) = 1, 'FAIL: sign-up retry wiped the portfolio';
  -- guards: no self-verification, no self-promotion
  begin update public.vendors set verified = true where id = vid; raise exception 'FAIL: vendor set verified' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set role = 'admin' where id = vo; raise exception 'FAIL: user set own role' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  -- allowed: own offer fields
  update public.offers set total_units = 2, price = 10000 where id = oid;
  get diagnostics n = row_count; assert n = 1, 'FAIL: owner offer update';
  update public.vendors set prepay_percent = 30 where id = vid;
  perform set_config('role', 'none', true);

  -- ── bookings: availability under lock ──
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  b1 := (public.create_booking(oid, d1, 2)).id;
  assert (select prepay_amount from public.bookings where id = b1) = 6000, 'FAIL: prepay 30% of 20000';
  begin insert into public.transactions (kind, amount) values ('payout', 1); raise exception 'FAIL: client wrote ledger' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  begin update public.bookings set status = 'completed' where id = b1; raise exception 'FAIL: client updated booking' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  perform set_config('role', 'none', true);

  perform set_config('request.jwt.claims', json_build_object('sub', c2, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin perform public.create_booking(oid, d1, 1); raise exception 'FAIL: overbooking allowed' using errcode = 'T0001';
  exception when sqlstate 'P0001' then null; end;
  assert (select count(*) from public.bookings) = 0, 'FAIL: client sees others bookings';
  perform set_config('role', 'none', true);

  perform set_config('role', 'anon', true);
  assert (select free from public.offer_availability(oid, d1, d1)) = 0, 'FAIL: availability after booking';
  assert (select count(*) from public.vendors where id = vid) = 1, 'FAIL: anon catalog';
  begin perform 1 from public.bookings; raise exception 'FAIL: anon read bookings' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  perform set_config('role', 'none', true);

  -- ── payment webhook (service) → escrow held ──
  conv := public.confirm_booking_payment(b1, 'pay-1');
  assert (select escrow_state from public.bookings where id = b1) = 'held', 'FAIL: escrow held';
  assert (select count(*) from public.transactions where booking_id = b1 and kind = 'hold' and amount = 6000) = 1, 'FAIL: hold entry';
  assert exists (select 1 from public.messages where conversation_id = conv and system and text = 'escrow_held'), 'FAIL: system message';
  assert exists (select 1 from public.notifications where user_id = vo and kind = 'booking_new'), 'FAIL: vendor notified';

  -- ── chat ──
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.messages (conversation_id, sender_id, text) values (conv, c1, 'Здравствуйте');
  st := public.confirm_deal(b1);
  assert st = 'held', 'FAIL: one-side confirm';
  perform set_config('role', 'none', true);
  assert exists (select 1 from public.notifications where user_id = vo and kind = 'message'), 'FAIL: message notification';

  perform set_config('request.jwt.claims', json_build_object('sub', c2, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  assert (select count(*) from public.messages where conversation_id = conv) = 0, 'FAIL: outsider reads chat';
  begin insert into public.messages (conversation_id, sender_id, text) values (conv, c2, 'spam'); raise exception 'FAIL: outsider wrote chat' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  begin perform public.confirm_deal(b1); raise exception 'FAIL: outsider confirmed deal' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  perform set_config('role', 'none', true);

  -- ── both confirm → release minus 5% fee; payout once ──
  perform set_config('request.jwt.claims', json_build_object('sub', vo, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  st := public.confirm_deal(b1);
  assert st = 'released', 'FAIL: release';
  assert (select amount from public.transactions where booking_id = b1 and kind = 'release') = 5700, 'FAIL: release amount';
  assert (select amount from public.transactions where booking_id = b1 and kind = 'fee') = 300, 'FAIL: fee amount';
  assert public.request_payout(vid, 999999) = 5700, 'FAIL: payout amount';
  begin perform public.request_payout(vid, 1); raise exception 'FAIL: double payout' using errcode = 'T0001';
  exception when sqlstate '22023' then null; end;
  perform set_config('role', 'none', true);

  -- ── review after a finished deal → rating ──
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.reviews (vendor_id, booking_id, author_id, author, rating, text) values (vid, b1, c1, 'fake name', 4, '{"ru":"Хорошо","en":"Хорошо"}');
  perform set_config('role', 'none', true);
  assert (select rating from public.vendors where id = vid) = 4.0 and (select reviews_count from public.vendors where id = vid) = 1, 'FAIL: rating trigger';
  assert (select author from public.reviews where booking_id = b1) = 'Айгерим', 'FAIL: author stamped';
  perform set_config('request.jwt.claims', json_build_object('sub', c2, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin insert into public.reviews (vendor_id, author_id, author, rating, text) values (vid, c2, 'x', 1, '{"ru":"x","en":"x"}');
    raise exception 'FAIL: review without a deal' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  perform set_config('role', 'none', true);

  -- ── dispute → admin refund ──
  perform set_config('request.jwt.claims', json_build_object('sub', c2, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  b2 := (public.create_booking(oid, d2, 1)).id;
  perform set_config('role', 'none', true);
  perform public.confirm_booking_payment(b2, 'pay-2');
  perform set_config('role', 'authenticated', true);
  perform public.open_dispute(b2, 'Не приехал');
  begin perform public.resolve_dispute(b2, 'release'); raise exception 'FAIL: client resolved dispute' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  perform set_config('role', 'none', true);
  assert exists (select 1 from public.notifications where user_id = ad and kind = 'escrow_disputed'), 'FAIL: admin told about dispute';
  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  perform public.resolve_dispute(b2, 'refund');
  perform set_config('role', 'none', true);
  assert (select escrow_state from public.bookings where id = b2) = 'refunded', 'FAIL: refund';
  assert (select count(*) from public.transactions where booking_id = b2 and kind = 'refund' and amount = 3000) = 1, 'FAIL: refund entry';

  -- ── complaints: own content refused; 3 reports hide the post ──
  perform set_config('request.jwt.claims', json_build_object('sub', vo, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin insert into public.complaints (author_id, target, target_id, reason) values (vo, 'post', pid, 'spam');
    raise exception 'FAIL: reported own post' using errcode = 'T0001';
  exception when insufficient_privilege then null; end;
  perform set_config('role', 'none', true);
  foreach vid in array array[c1, c2, c3] loop
    perform set_config('request.jwt.claims', json_build_object('sub', vid, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    insert into public.complaints (author_id, target, target_id, reason) values (vid, 'post', pid, 'spam');
    perform set_config('role', 'none', true);
  end loop;
  assert (select hidden from public.posts where id = pid), 'FAIL: auto-hide';
  perform set_config('role', 'anon', true);
  assert (select count(*) from public.posts where id = pid) = 0, 'FAIL: hidden post visible to anon';
  perform set_config('role', 'none', true);

  -- ── invitation: guest answers without an account ──
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  insert into public.invitations (owner_id, style, occasion, design) values (c1, 'classic', 'wedding', '{}') returning id into vid;
  perform set_config('role', 'anon', true);
  assert public.public_invitation(vid) ->> 'style' = 'classic', 'FAIL: public invitation';
  assert public.public_invitation(vid) -> 'owner_id' is null, 'FAIL: owner leaked';
  perform public.submit_rsvp(vid, 'Гость', true, 2);
  perform set_config('role', 'none', true);
  assert exists (select 1 from public.notifications where user_id = c1 and kind = 'rsvp'), 'FAIL: rsvp notification';

  raise notice 'smoke: all checks passed';
end $$;

rollback;
