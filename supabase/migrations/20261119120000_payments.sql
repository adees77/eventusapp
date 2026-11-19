-- Real payments (FreedomPay, lib/payments/freedompay). One-stage payment: the prepayment lands on the
-- EVENTUS merchant balance, the deal escrow stays our ledger (bookings.escrow_state + transactions).
--
--   client: start_payment(booking)          → payments row 'created' (one attempt per checkout)
--   server: attach_payment(…)               → 'pending' + FreedomPay payment id / redirect
--   FreedomPay check  → payment_check(…)    → may the client still pay? (booking pending, units free, sum)
--   FreedomPay result → payment_succeeded(…)→ 'paid' + confirm_booking_payment (escrow held)
--                                             or 'refund_pending' when the booking can no longer be held
--                     → payment_failed(…)   → 'failed'
--   server after a refund/rejection          → payment_closed(…) → 'refunded' | 'rejected'
-- Every webhook-side function is service_role only; payments are written by nothing else.

create type public.payment_status as enum ('created', 'pending', 'paid', 'failed', 'rejected', 'refund_pending', 'refunded');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  client_id uuid not null references public.profiles (id),
  provider text not null default 'freedompay',
  provider_payment_id text unique,
  amount int not null check (amount > 0),
  currency text not null default 'KGS',
  status public.payment_status not null default 'created',
  redirect_url text,
  -- masked card number from the provider (e.g. 4400-44XX-XXXX-4444); never the full number
  card_pan text check (length(card_pan) <= 32),
  testing boolean not null default false,
  failure_code text,
  failure_description text check (length(failure_description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index payments_booking_idx on public.payments (booking_id);
-- one successful payment per booking
create unique index payments_one_paid_idx on public.payments (booking_id) where status = 'paid';

-- Raw provider callbacks (audit / reconciliation). Personal fields are stripped by the server.
create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid references public.payments (id),
  provider_payment_id text,
  kind text not null check (kind in ('check', 'result', 'refund', 'status')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index payment_events_payment_idx on public.payment_events (payment_id);

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
grant select on public.payments to authenticated;
grant select on public.payment_events to authenticated;

create policy payments_select on public.payments for select to authenticated
  using (client_id = (select auth.uid())
         or (select public.is_admin())
         or exists (select 1 from public.bookings b where b.id = booking_id and public.owns_vendor(b.vendor_id)));
create policy payment_events_select on public.payment_events for select to authenticated
  using ((select public.is_admin()));

create function public._touch_payment() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger payments_touch before update on public.payments for each row execute function public._touch_payment();

-- ─────────────── client ───────────────
-- «Оплатить» on the checkout: a new payment attempt for the caller's pending booking.
create function public.start_payment(p_booking uuid)
returns table (payment_id uuid, amount int, currency text, description text)
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public._uid();
  b public.bookings;
  p public.payments;
begin
  select * into b from public.bookings where id = p_booking for update;
  if not found or b.client_id <> me then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if b.status <> 'pending' or b.escrow_state <> 'none' or b.prepay_amount <= 0 then
    raise exception 'escrow: state' using errcode = '22023';
  end if;
  if (select total_units from public.offers where id = b.offer_id) - public._units_taken(b.offer_id, b.date, b.id) < b.qty then
    raise exception 'not enough units' using errcode = 'P0001', hint = 'availability';
  end if;
  -- the pending booking holds its units for 15 minutes from creation; if the card is charged after
  -- someone else took them, payment_succeeded answers 'refund'
  insert into public.payments (booking_id, client_id, amount) values (b.id, me, b.prepay_amount) returning * into p;
  return query
    select p.id, p.amount, p.currency, left(v.name || ' — ' || coalesce(o.title ->> 'ru', ''), 250)
      from public.offers o join public.vendors v on v.id = o.vendor_id where o.id = b.offer_id;
end $$;

-- ─────────────── server (service_role) ───────────────
create function public.attach_payment(p_payment uuid, p_provider_payment_id text, p_redirect_url text, p_testing boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.payments
     set status = 'pending', provider_payment_id = p_provider_payment_id, redirect_url = p_redirect_url, testing = p_testing
   where id = p_payment and status = 'created';
  if not found then raise exception 'payment: state' using errcode = '22023'; end if;
end $$;

-- FreedomPay asks before charging the card. true = may pay.
create function public.payment_check(p_payment uuid, p_provider_payment_id text, p_amount numeric, p_currency text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
  b public.bookings;
begin
  select * into p from public.payments where id = p_payment;
  if not found or p.status not in ('created', 'pending') then return false; end if;
  if p.provider_payment_id is not null and p.provider_payment_id <> p_provider_payment_id then return false; end if;
  if p_amount <> p.amount or upper(p_currency) <> p.currency then return false; end if;
  select * into b from public.bookings where id = p.booking_id;
  if b.status <> 'pending' or b.escrow_state <> 'none' then return false; end if;
  return (select total_units from public.offers where id = b.offer_id) - public._units_taken(b.offer_id, b.date, b.id) >= b.qty;
end $$;

-- FreedomPay says the money was paid. Idempotent (callbacks are retried).
--   {"outcome": "ok"|"duplicate", "conversation": uuid}  — escrow is held
--   {"outcome": "refund"}   — paid, but the booking can't be held (taken, cancelled, wrong sum): give it back
--   {"outcome": "unknown"}  — no such payment of ours
create function public.payment_succeeded(
  p_payment uuid, p_provider_payment_id text, p_amount numeric, p_currency text, p_card_pan text, p_testing boolean
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.payments;
  conv uuid;
begin
  select * into p from public.payments where id = p_payment for update;
  if not found or (p.provider_payment_id is not null and p.provider_payment_id <> p_provider_payment_id) then
    return jsonb_build_object('outcome', 'unknown');
  end if;
  if p.status = 'paid' then
    select id into conv from public.conversations where booking_id = p.booking_id;
    return jsonb_build_object('outcome', 'duplicate', 'conversation', conv);
  end if;
  if p.status in ('refund_pending', 'refunded', 'rejected') then return jsonb_build_object('outcome', 'refund'); end if;

  update public.payments
     set provider_payment_id = p_provider_payment_id, card_pan = left(p_card_pan, 32), testing = p_testing, paid_at = now()
   where id = p.id;
  if p_amount <> p.amount or upper(p_currency) <> p.currency then
    update public.payments set status = 'refund_pending', failure_description = 'amount mismatch' where id = p.id;
    return jsonb_build_object('outcome', 'refund');
  end if;
  begin
    conv := public.confirm_booking_payment(p.booking_id, 'freedompay:' || p_provider_payment_id);
  exception when others then
    update public.payments set status = 'refund_pending', failure_description = left(sqlerrm, 500) where id = p.id;
    return jsonb_build_object('outcome', 'refund');
  end;
  update public.payments set status = 'paid' where id = p.id;
  return jsonb_build_object('outcome', 'ok', 'conversation', conv);
end $$;

create function public.payment_failed(p_payment uuid, p_provider_payment_id text, p_code text, p_description text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.payments
     set status = 'failed', provider_payment_id = coalesce(provider_payment_id, p_provider_payment_id),
         failure_code = left(p_code, 32), failure_description = left(p_description, 500)
   where id = p_payment and status in ('created', 'pending');
end $$;

-- The server gave the money back (refund_pending → refunded) or FreedomPay did on our «rejected».
create function public.payment_closed(p_payment uuid, p_status public.payment_status)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('refunded', 'rejected') then raise exception 'payment: state' using errcode = '22023'; end if;
  update public.payments set status = p_status where id = p_payment and status in ('refund_pending', 'pending', 'created');
end $$;

-- Same lock-down as 20261115120500: nothing new is reachable by default.
revoke execute on function public.start_payment(uuid), public.attach_payment(uuid, text, text, boolean),
  public.payment_check(uuid, text, numeric, text), public.payment_succeeded(uuid, text, numeric, text, text, boolean),
  public.payment_failed(uuid, text, text, text), public.payment_closed(uuid, public.payment_status), public._touch_payment()
  from public, anon, authenticated;
grant execute on function public.start_payment(uuid) to authenticated;
grant execute on function public.start_payment(uuid), public.attach_payment(uuid, text, text, boolean),
  public.payment_check(uuid, text, numeric, text), public.payment_succeeded(uuid, text, numeric, text, text, boolean),
  public.payment_failed(uuid, text, text, text), public.payment_closed(uuid, public.payment_status)
  to service_role;
grant select, insert, update on public.payments to service_role;
grant select, insert on public.payment_events to service_role;
