-- EVENTUS — server functions (called with supabase.rpc). Each one is a single transaction.
--
-- Why functions and not table writes: these steps touch several rows or move money, so they must be
-- atomic and checked on the server — availability under a row lock, escrow transitions with ledger
-- entries, one-shot sign-up. The client has no insert/update grants on bookings, transactions,
-- conversations or vendor_stats at all.
--
-- All are `security definer` with an empty search_path; each checks the caller (auth.uid()) itself,
-- mirroring lib/data/policies.ts and the state machine in lib/payments/escrow.ts.
-- System messages and notifications for these changes are written by triggers (…_triggers.sql).

-- ─────────────── Small helpers ───────────────
create function public._uid() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles where id = v and blocked) then
    raise exception 'account blocked' using errcode = '42501';
  end if;
  return v;
end $$;

create function public._deny(p_action text) returns void
language plpgsql immutable as $$
begin
  raise exception 'access denied: %', p_action using errcode = '42501';
end $$;

-- Units of an offer taken on a date: manual block + bookings that hold inventory.
-- An unpaid (pending) booking holds its units for 15 minutes (PENDING_HOLD_MS in lib/data/availability.ts).
create function public._units_taken(p_offer uuid, p_date date, p_exclude uuid default null) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select units from public.availability_blocks where offer_id = p_offer and date = p_date), 0)
       + coalesce((
           select sum(qty)::int from public.bookings
           where offer_id = p_offer and date = p_date and id is distinct from p_exclude
             and (status in ('prepaid', 'confirmed', 'completed')
                  or (status = 'pending' and created_at > now() - interval '15 minutes'))
         ), 0)
$$;

-- ─────────────── Availability (public) ───────────────
-- Free units per day for a calendar. Bookings themselves stay private; only counts leave the server.
create function public.offer_availability(p_offer uuid, p_from date, p_to date)
returns table (date date, total int, blocked int, booked int, free int)
language sql stable security definer set search_path = '' as $$
  with o as (
    select id, total_units from public.offers
    where id = p_offer and active and public.vendor_visible(vendor_id)
  ),
  days as (select d::date as date from o, generate_series(p_from::timestamp, least(p_to, p_from + 400)::timestamp, interval '1 day') d)
  select days.date,
         o.total_units,
         coalesce(b.units, 0),
         public._units_taken(o.id, days.date) - coalesce(b.units, 0),
         greatest(0, o.total_units - public._units_taken(o.id, days.date))
  from days cross join o
  left join public.availability_blocks b on b.offer_id = o.id and b.date = days.date
  order by days.date
$$;

-- ─────────────── Bookings ───────────────
create function public.create_booking(p_offer uuid, p_date date, p_qty int, p_event uuid default null, p_note text default null)
returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  o public.offers;
  v public.vendors;
  qty int := greatest(1, coalesce(p_qty, 1));
  free int;
  b public.bookings;
begin
  if not exists (select 1 from public.profiles where id = me and role = 'client') then perform public._deny('createBooking'); end if;
  -- the row lock serialises bookings of this offer: two clients cannot take the last unit at once
  select * into o from public.offers where id = p_offer for update;
  if not found or not o.active then raise exception 'offer not found' using errcode = 'P0002'; end if;
  select * into v from public.vendors where id = o.vendor_id;
  if v.hidden then raise exception 'offer not found' using errcode = 'P0002'; end if;
  if p_date < current_date then raise exception 'date in the past' using errcode = '22023'; end if;
  if o.max_per_booking is not null and qty > o.max_per_booking then raise exception 'too many units' using errcode = '22023'; end if;
  if p_event is not null and not exists (select 1 from public.events where id = p_event and client_id = me) then
    perform public._deny('createBooking:event');
  end if;

  free := o.total_units - public._units_taken(o.id, p_date);
  if free < qty then
    raise exception 'not enough units' using errcode = 'P0001', detail = json_build_object('free', greatest(free, 0))::text, hint = 'availability';
  end if;

  insert into public.bookings (offer_id, vendor_id, client_id, event_id, date, qty, total, prepay_amount, note, escrow_amount)
  values (o.id, v.id, me, p_event, p_date, qty, o.price * qty, round(o.price * qty * v.prepay_percent / 100.0)::int,
          nullif(left(btrim(coalesce(p_note, '')), 500), ''), 0)
  returning * into b;
  return b;
end $$;

-- Payment captured → prepayment frozen in escrow. Called by the payment provider's webhook with the
-- service role (never by the browser): the money is real only once the provider says so.
create function public.confirm_booking_payment(p_booking uuid, p_payment_ref text)
returns uuid  -- the booking's conversation
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
  conv uuid;
  cat public.category_id;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if b.status <> 'pending' or b.escrow_state <> 'none' then raise exception 'escrow: state' using errcode = '22023'; end if;
  perform 1 from public.offers where id = b.offer_id for update;
  if (select total_units from public.offers where id = b.offer_id) - public._units_taken(b.offer_id, b.date, b.id) < b.qty then
    raise exception 'not enough units' using errcode = 'P0001', hint = 'availability';
  end if;

  select id into conv from public.conversations where booking_id = b.id;
  if conv is null then
    -- the general client↔vendor thread becomes the booking's thread
    update public.conversations set booking_id = b.id
     where id = (select id from public.conversations where client_id = b.client_id and vendor_id = b.vendor_id and booking_id is null limit 1)
    returning id into conv;
  end if;
  if conv is null then
    insert into public.conversations (client_id, vendor_id, booking_id) values (b.client_id, b.vendor_id, b.id) returning id into conv;
  end if;

  update public.bookings
     set status = 'prepaid', escrow_state = 'held', escrow_amount = b.prepay_amount, held_at = now(), payment_ref = p_payment_ref
   where id = b.id;
  insert into public.transactions (kind, amount, booking_id, vendor_id, client_id) values ('hold', b.prepay_amount, b.id, b.vendor_id, b.client_id);

  -- the event's checklist item of this category is done
  if b.event_id is not null then
    select category into cat from public.vendors where id = b.vendor_id;
    update public.events
       set checklist = (
         select coalesce(jsonb_agg(case when item ->> 'category' = cat::text then item || '{"done":true}' else item end), '[]')
         from jsonb_array_elements(checklist) item)
     where id = b.event_id;
  end if;
  return conv;
end $$;

-- Which side of the deal the caller is
create function public._party(b public.bookings) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if b.client_id = auth.uid() then return 'client'; end if;
  if public.owns_vendor(b.vendor_id) then return 'vendor'; end if;
  raise exception 'escrow: party' using errcode = '42501';
end $$;

create function public._lock_booking(p_booking uuid) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  return b;
end $$;

-- Money to the vendor minus the platform fee (both confirmed, or admin decided)
create function public._release(b public.bookings) returns void
language plpgsql security definer set search_path = '' as $$
declare fee int := round(b.escrow_amount * (select fee_percent from public.platform_settings) / 100.0)::int;
begin
  update public.bookings set escrow_state = 'released', released_at = now(), status = 'confirmed' where id = b.id;
  insert into public.transactions (kind, amount, booking_id, vendor_id, client_id) values
    ('release', b.escrow_amount - fee, b.id, b.vendor_id, b.client_id),
    ('fee', fee, b.id, b.vendor_id, null);
end $$;

create function public._refund(b public.bookings) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings set escrow_state = 'refunded', refunded_at = now(), status = 'cancelled' where id = b.id;
  insert into public.transactions (kind, amount, booking_id, vendor_id, client_id) values ('refund', b.escrow_amount, b.id, b.vendor_id, b.client_id);
end $$;

-- «Подтвердить сделку». Releases the money when both sides have confirmed.
create function public.confirm_deal(p_booking uuid) returns public.escrow_state
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  b public.bookings := public._lock_booking(p_booking);
  party text := public._party(b);
begin
  if b.escrow_state <> 'held' then raise exception 'escrow: state' using errcode = '22023'; end if;
  if party = 'client' then
    update public.bookings set client_confirmed_at = coalesce(client_confirmed_at, now()) where id = b.id returning * into b;
  else
    update public.bookings set vendor_confirmed_at = coalesce(vendor_confirmed_at, now()) where id = b.id returning * into b;
  end if;
  if b.client_confirmed_at is not null and b.vendor_confirmed_at is not null then
    perform public._release(b);
    return 'released';
  end if;
  return 'held';
end $$;

-- A side withdraws its confirmation (only while the money is still held)
create function public.unconfirm_deal(p_booking uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  b public.bookings := public._lock_booking(p_booking);
  party text := public._party(b);
begin
  if b.escrow_state <> 'held' then raise exception 'escrow: state' using errcode = '22023'; end if;
  if party = 'client' then update public.bookings set client_confirmed_at = null where id = b.id;
  else update public.bookings set vendor_confirmed_at = null where id = b.id; end if;
end $$;

-- Cancel before the deal is agreed → full refund of the frozen prepayment
create function public.cancel_deal(p_booking uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  b public.bookings := public._lock_booking(p_booking);
begin
  if not public.is_admin() then perform public._party(b); end if;
  if b.escrow_state <> 'held' then raise exception 'escrow: state' using errcode = '22023'; end if;
  perform public._refund(b);
end $$;

create function public.open_dispute(p_booking uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  b public.bookings := public._lock_booking(p_booking);
  reason text := left(btrim(coalesce(p_reason, '')), 600);
begin
  perform public._party(b);
  if b.escrow_state <> 'held' then raise exception 'escrow: state' using errcode = '22023'; end if;
  if reason = '' then raise exception 'escrow: reason' using errcode = '22023'; end if;
  update public.bookings set escrow_state = 'disputed', dispute_by = me, dispute_reason = reason, dispute_opened_at = now() where id = b.id;
end $$;

-- Admin decision on a dispute
create function public.resolve_dispute(p_booking uuid, p_resolution public.dispute_resolution) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  b public.bookings := public._lock_booking(p_booking);
begin
  if not public.is_admin() then perform public._deny('resolveDispute'); end if;
  if b.escrow_state <> 'disputed' then raise exception 'escrow: state' using errcode = '22023'; end if;
  update public.bookings set dispute_resolution = p_resolution, dispute_resolved_at = now() where id = b.id returning * into b;
  if p_resolution = 'release' then perform public._release(b); else perform public._refund(b); end if;
end $$;

-- Status changes outside the escrow: vendor confirms/completes/cancels, the client cancels an unpaid booking.
-- Cancelling a booking with frozen money always refunds the client.
create function public.set_booking_status(p_booking uuid, p_status public.booking_status) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  b public.bookings := public._lock_booking(p_booking);
  allowed boolean;
begin
  allowed := public.is_admin()
    or (public.owns_vendor(b.vendor_id) and p_status <> 'pending')
    or (b.client_id = me and p_status = 'cancelled' and (b.status = 'pending' or b.escrow_state = 'held'));
  if not allowed then perform public._deny('setBookingStatus'); end if;
  if p_status = 'cancelled' and b.escrow_state = 'held' then
    perform public._refund(b);
    return;
  end if;
  update public.bookings set status = p_status where id = b.id;
end $$;

-- Payout of the available balance (released minus paid out). The vendor row lock stops a double payout.
create function public.request_payout(p_vendor uuid, p_amount int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  v_available int;
  v_amount int;
begin
  if not (public.owns_vendor(p_vendor) or public.is_admin()) then perform public._deny('payout'); end if;
  perform 1 from public.vendors where id = p_vendor for update;
  select coalesce(sum(case t.kind when 'release' then t.amount when 'payout' then -t.amount else 0 end), 0)::int into v_available
    from public.transactions t where t.vendor_id = p_vendor;
  v_amount := least(coalesce(p_amount, 0), v_available);
  if v_amount <= 0 then raise exception 'escrow: state' using errcode = '22023'; end if;
  insert into public.transactions (kind, amount, vendor_id) values ('payout', v_amount, p_vendor);
  return v_amount;
end $$;

-- Escrow auto-release: N days (platform_settings.auto_release_days) after the event date, if nobody
-- disputed, the money goes to the vendor. Scheduled with pg_cron below.
create function public.auto_release_due_deals() returns int
language plpgsql security definer set search_path = '' as $$
declare
  b public.bookings;
  n int := 0;
  days int := (select auto_release_days from public.platform_settings);
begin
  for b in
    select * from public.bookings
    where escrow_state = 'held' and date + days < current_date
    for update skip locked
  loop
    perform public._release(b);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ─────────────── Chat ───────────────
-- Find or create the thread between a client and a vendor (optionally bound to a booking)
create function public.ensure_conversation(p_vendor uuid, p_booking uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  client uuid;
  conv uuid;
begin
  if p_booking is not null then
    select client_id into client from public.bookings
     where id = p_booking and vendor_id = p_vendor and (client_id = me or public.owns_vendor(vendor_id) or public.is_admin());
    if client is null then perform public._deny('ensureConversation'); end if;
    select id into conv from public.conversations where booking_id = p_booking;
    if conv is not null then return conv; end if;
    -- the general thread becomes the booking's thread
    update public.conversations set booking_id = p_booking
     where id = (select id from public.conversations where client_id = client and vendor_id = p_vendor and booking_id is null limit 1)
    returning id into conv;
    if conv is null then
      insert into public.conversations (client_id, vendor_id, booking_id) values (client, p_vendor, p_booking) returning id into conv;
    end if;
    return conv;
  end if;

  if not exists (select 1 from public.profiles where id = me and role = 'client') then perform public._deny('ensureConversation'); end if;
  if not public.vendor_visible(p_vendor) then raise exception 'vendor not found' using errcode = 'P0002'; end if;
  select id into conv from public.conversations where client_id = me and vendor_id = p_vendor order by booking_id nulls first, updated_at desc limit 1;
  if conv is null then
    insert into public.conversations (client_id, vendor_id) values (me, p_vendor)
    on conflict (client_id, vendor_id) where booking_id is null do update set updated_at = excluded.updated_at
    returning id into conv;
  end if;
  return conv;
end $$;

create function public.mark_read(p_conversation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  update public.conversations set client_read_at = now() where id = p_conversation and client_id = me;
  update public.conversations set vendor_read_at = now() where id = p_conversation and public.owns_vendor(vendor_id);
end $$;

-- Display names of other people (chat partner, review author). Only name and avatar leave the server.
create function public.profile_cards(p_ids uuid[]) returns table (id uuid, name text, avatar text, role public.user_role)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.avatar, p.role from public.profiles p where p.id = any (p_ids) limit 200
$$;

-- ─────────────── Catalog ───────────────
create function public.track_view(p_vendor uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.vendor_stats (vendor_id, views)
  select p_vendor, 1 where public.vendor_visible(p_vendor) and not public.owns_vendor(p_vendor)
  on conflict (vendor_id) do update set views = public.vendor_stats.views + 1
$$;

-- The vendor answers a review (empty text removes the answer)
create function public.reply_to_review(p_review uuid, p_text text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  clean text := nullif(left(btrim(coalesce(p_text, '')), 1000), '');
begin
  update public.reviews set reply_text = clean, reply_date = case when clean is null then null else current_date end
   where id = p_review and (public.owns_vendor(vendor_id) or public.is_admin());
  if not found then perform public._deny('replyReview'); end if;
end $$;

-- ─────────────── Accounts ───────────────
-- The whole vendor sign-up in one transaction: profile, vendor with details and photos, first service and
-- first post, onboarding done. Re-running finishes an earlier interrupted attempt by reusing its vendor.
-- The client prepares portfolio/cover (stock photos) and sanitises specs (lib/data/specs.ts).
create function public.sign_up_vendor(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  s public.platform_settings := (select x from public.platform_settings x);
  v public.vendors;
  v_name text := left(btrim(coalesce(p ->> 'name', '')), 80);
  v_tagline text := left(btrim(coalesce(p ->> 'tagline', '')), 160);
  v_photos text[] := coalesce((select array_agg(x) from (select jsonb_array_elements_text(p -> 'photos') x limit 10) t), '{}');
  v_portfolio text[];
  v_offer uuid;
  v_post uuid;
begin
  v_portfolio := coalesce((select array_agg(x) from (select jsonb_array_elements_text(p -> 'portfolio') x limit 20) t), v_photos);
  if (select role from public.profiles where id = me) = 'admin' then perform public._deny('signUpVendor'); end if;
  if v_name = '' or p ->> 'category' is null or not public.is_ltext(p -> 'offer' -> 'unit') then
    raise exception 'invalid sign-up' using errcode = '22023';
  end if;

  update public.profiles
     set name = coalesce(nullif(left(btrim(p ->> 'ownerName'), 80), ''), profiles.name), role = 'vendor',
         needs_onboarding = false, onboarded_at = now(), phone = coalesce(nullif(left(btrim(p ->> 'phone'), 30), ''), profiles.phone)
   where id = me;

  insert into public.vendors as t (owner_id, slug, name, category, city, tagline, phone, specs, portfolio, cover, hidden, prepay_percent)
  values (
    me,
    coalesce(nullif(trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9а-яё]+', '-', 'g')), ''), 'vendor') || '-' || substr(md5(gen_random_uuid()::text), 1, 4),
    v_name, (p ->> 'category')::public.category_id, coalesce(p ->> 'city', 'bishkek'),
    jsonb_build_object('ru', v_tagline, 'en', v_tagline),
    coalesce(left(btrim(p ->> 'phone'), 30), ''),
    coalesce(p -> 'specs', '{}'), v_portfolio, coalesce(p ->> 'cover', v_photos[1], ''),
    s.hide_unverified, s.default_prepay_percent
  )
  -- an interrupted earlier attempt: update the vendor it created instead of making a second one
  on conflict (owner_id) do update set
    name = excluded.name, category = excluded.category, city = excluded.city, tagline = excluded.tagline,
    phone = excluded.phone, specs = excluded.specs, portfolio = excluded.portfolio, cover = excluded.cover
  returning * into v;

  insert into public.offers (vendor_id, title, description, price, unit, photos)
  values (v.id,
          jsonb_build_object('ru', left(btrim(p -> 'offer' ->> 'title'), 120), 'en', left(btrim(p -> 'offer' ->> 'title'), 120)),
          '{"ru":"","en":""}', greatest(0, coalesce((p -> 'offer' ->> 'price')::int, 0)), p -> 'offer' -> 'unit', v_photos[1:1])
  returning id into v_offer;

  insert into public.posts (vendor_id, photos, caption, category, offer_id, ratio)
  values (v.id, case when cardinality(v_photos) > 0 then v_photos else v_portfolio[1:3] end,
          jsonb_build_object('ru', v_tagline, 'en', v_tagline), v.category, v_offer, 1.25)
  returning id into v_post;

  return jsonb_build_object('vendor_id', v.id, 'slug', v.slug, 'offer_id', v_offer, 'post_id', v_post);
end $$;

-- Client onboarding: name/city, the first event with a checklist ordered by priorities, onboarding done
create function public.complete_client_onboarding(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  e uuid;
begin
  if (select role from public.profiles where id = me) <> 'client' then perform public._deny('onboarding'); end if;
  update public.profiles
     set name = coalesce(nullif(left(btrim(p ->> 'name'), 80), ''), name), city = coalesce(p ->> 'city', city),
         needs_onboarding = false, onboarded_at = now()
   where id = me;
  insert into public.events (client_id, title, date, city, guests, budget, checklist)
  values (me, left(coalesce(p -> 'event' ->> 'title', 'Той'), 120), (p -> 'event' ->> 'date')::date, coalesce(p ->> 'city', 'bishkek'),
          greatest(0, coalesce((p -> 'event' ->> 'guests')::int, 0)), greatest(0, coalesce((p -> 'event' ->> 'budget')::int, 0)),
          coalesce(p -> 'checklist', '[]'))
  returning id into e;
  return e;
end $$;

-- ─────────────── Moderation ───────────────
-- The vendor sends papers for review once every required document is uploaded and none is rejected
create function public.request_verification(p_vendor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  missing int;
begin
  if not public.owns_vendor(p_vendor) then perform public._deny('requestVerification'); end if;
  select count(*) into missing from unnest((select required_docs from public.platform_settings)) k
   where not exists (select 1 from public.vendor_documents d where d.vendor_id = p_vendor and d.kind = k and d.status <> 'rejected');
  if missing > 0 or exists (select 1 from public.vendor_documents where vendor_id = p_vendor and status = 'rejected') then
    raise exception 'documents missing' using errcode = '22023';
  end if;
  update public.vendors set verification_state = 'pending', verification_requested_at = now(), verification_note = null where id = p_vendor;
end $$;

create function public.decide_verification(p_vendor uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public._uid();
begin
  if not public.is_admin() then perform public._deny('decideVerification'); end if;
  if p_approve then
    update public.vendors set verified = true, verification_state = null, verification_note = null, verification_reviewed_at = now() where id = p_vendor;
    update public.vendor_documents set status = 'approved', reviewed_at = now() where vendor_id = p_vendor and status = 'pending';
  else
    update public.vendors set verification_state = 'rejected', verification_note = left(p_note, 300), verification_reviewed_at = now() where id = p_vendor;
  end if;
end $$;

-- Hide/unhide the content a complaint is about
create function public._set_target_hidden(p_target public.complaint_target, p_id uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  case p_target
    when 'vendor' then update public.vendors set hidden = p_hidden where id = p_id;
    when 'post' then update public.posts set hidden = p_hidden where id = p_id;
    when 'review' then update public.reviews set hidden = p_hidden where id = p_id;
  end case;
end $$;

-- Admin closes every open report on the same thing at once: hides it or keeps it
create function public.resolve_complaint(p_complaint uuid, p_hide boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  c public.complaints;
begin
  if not public.is_admin() then perform public._deny('resolveComplaint'); end if;
  select * into c from public.complaints where id = p_complaint;
  if not found then return; end if;
  update public.complaints
     set status = case when p_hide then 'resolved'::public.complaint_status else 'dismissed' end,
         resolution = case when p_hide then 'hidden'::public.complaint_resolution else 'kept' end,
         resolved_at = now()
   where target_id = c.target_id and status = 'open';
  perform public._set_target_hidden(c.target, c.target_id, p_hide);
end $$;

-- ─────────────── Invitations (guests have no account) ───────────────
-- The guest-facing page: everything needed to render it, nothing about other guests
create function public.public_invitation(p_id uuid, p_guest uuid default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(i) - 'owner_id'
         || jsonb_build_object('guest', (select jsonb_build_object('id', g.id, 'name', g.name)
                                         from public.invitation_guests g where g.id = p_guest and g.invitation_id = i.id))
  from public.invitations i where i.id = p_id
$$;

create function public.submit_rsvp(p_invitation uuid, p_name text, p_attending boolean, p_guests int, p_note text default null, p_guest uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  r uuid;
  guest uuid := (select id from public.invitation_guests where id = p_guest and invitation_id = p_invitation);
begin
  if not exists (select 1 from public.invitations where id = p_invitation) then raise exception 'invitation not found' using errcode = 'P0002'; end if;
  if btrim(coalesce(p_name, '')) = '' then raise exception 'name required' using errcode = '22023'; end if;
  -- one answer per invited guest: a new answer replaces the old one
  if guest is not null then delete from public.invitation_rsvps where invitation_id = p_invitation and guest_id = guest; end if;
  insert into public.invitation_rsvps (invitation_id, guest_id, name, attending, guests, note)
  values (p_invitation, guest, left(btrim(p_name), 80), p_attending, least(greatest(coalesce(p_guests, 1), 0), 50), nullif(left(btrim(coalesce(p_note, '')), 500), ''))
  returning id into r;
  return r;
end $$;

create function public.record_invitation_view(p_invitation uuid, p_guest uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare guest uuid := (select id from public.invitation_guests where id = p_guest and invitation_id = p_invitation);
begin
  if not exists (select 1 from public.invitations where id = p_invitation) then return; end if;
  -- the host previewing their own page is not a view
  if exists (select 1 from public.invitations where id = p_invitation and owner_id = auth.uid()) then return; end if;
  insert into public.invitation_views (invitation_id, guest_id) values (p_invitation, guest);
  if guest is not null then update public.invitation_guests set opened_at = coalesce(opened_at, now()) where id = guest; end if;
end $$;

-- ─────────────── Who may call what ───────────────
grant execute on function
  public.offer_availability(uuid, date, date), public.public_invitation(uuid, uuid),
  public.submit_rsvp(uuid, text, boolean, int, text, uuid), public.record_invitation_view(uuid, uuid), public.track_view(uuid)
to anon, authenticated;

grant execute on function
  public.create_booking(uuid, date, int, uuid, text), public.confirm_deal(uuid), public.unconfirm_deal(uuid),
  public.cancel_deal(uuid), public.open_dispute(uuid, text), public.resolve_dispute(uuid, public.dispute_resolution),
  public.set_booking_status(uuid, public.booking_status), public.request_payout(uuid, int),
  public.ensure_conversation(uuid, uuid), public.mark_read(uuid), public.profile_cards(uuid[]),
  public.reply_to_review(uuid, text), public.sign_up_vendor(jsonb), public.complete_client_onboarding(jsonb),
  public.request_verification(uuid), public.decide_verification(uuid, boolean, text), public.resolve_complaint(uuid, boolean)
to authenticated;

-- payment webhook and cron only
grant execute on function public.confirm_booking_payment(uuid, text), public.auto_release_due_deals() to service_role;
