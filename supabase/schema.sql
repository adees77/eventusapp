-- EVENTUS — Postgres schema for Supabase.
-- Mirrors lib/data/types.ts. The demo currently runs on a local mock store;
-- the same access rules live in lib/data/policies.ts and are enforced here via RLS.

create type user_role as enum ('client', 'vendor', 'admin');
create type booking_status as enum ('pending', 'prepaid', 'confirmed', 'completed', 'cancelled');

-- Profiles are 1:1 with auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'client',
  name text not null,
  phone text,
  avatar text,
  created_at timestamptz not null default now()
);

create table categories (
  id text primary key,
  name jsonb not null,            -- {"ru": "...", "en": "..."}
  icon text not null,
  sort_order int not null default 0
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id),
  slug text unique not null,
  name text not null,
  category text not null references categories(id),
  city text not null,
  tagline jsonb not null,
  description jsonb not null,
  rating numeric(2,1) not null default 0,
  reviews_count int not null default 0,
  verified boolean not null default false,
  hidden boolean not null default false,
  prepay_percent int not null default 30 check (prepay_percent between 0 and 100),
  cover text,
  portfolio text[] not null default '{}',
  phone text,
  instagram text,
  years_on_market int,
  response_minutes int,
  created_at timestamptz not null default now()
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  title jsonb not null,
  description jsonb not null,
  price int not null check (price >= 0),           -- KGS
  unit jsonb not null,
  total_units int not null check (total_units >= 0),
  max_per_booking int,
  capacity int,
  photos text[] not null default '{}',
  premium boolean not null default false,
  active boolean not null default true
);

create table availability_blocks (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  date date not null,
  units int not null check (units >= 0),
  unique (offer_id, date)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  date date,
  city text,
  guests int,
  budget int,
  checklist jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id),
  vendor_id uuid not null references vendors(id),
  client_id uuid not null references profiles(id),
  event_id uuid references events(id) on delete set null,
  date date not null,
  qty int not null check (qty > 0),
  total int not null,
  prepay_amount int not null,
  status booking_status not null default 'pending',
  payment_ref text,
  note text,
  created_at timestamptz not null default now()
);
create index on bookings (offer_id, date);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id),
  vendor_id uuid not null references vendors(id),
  booking_id uuid references bookings(id),
  read_at jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  text text not null check (char_length(text) <= 4000),
  system boolean not null default false,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  author text not null,
  rating int not null check (rating between 1 and 5),
  text jsonb not null,
  date date not null default current_date
);

create table favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  vendor_id uuid not null references vendors(id) on delete cascade,
  primary key (user_id, vendor_id)
);

create table vendor_stats (
  vendor_id uuid primary key references vendors(id) on delete cascade,
  views int not null default 0
);

-- ─────────────── Helpers ───────────────
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function owns_vendor(v uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vendors where id = v and owner_id = auth.uid());
$$;

-- ─────────────── RLS ───────────────
alter table profiles enable row level security;
alter table categories enable row level security;
alter table vendors enable row level security;
alter table offers enable row level security;
alter table availability_blocks enable row level security;
alter table events enable row level security;
alter table bookings enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table favorites enable row level security;
alter table vendor_stats enable row level security;

-- profiles
create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on profiles for update using (id = auth.uid())
  with check (role = (select role from profiles where id = auth.uid())); -- cannot self-promote

-- categories: public read, admin write
create policy "categories read" on categories for select using (true);
create policy "categories admin" on categories for all using (is_admin()) with check (is_admin());

-- vendors: public read unless hidden; owner edits own; admin everything
create policy "vendors read" on vendors for select using (not hidden or owner_id = auth.uid() or is_admin());
create policy "vendors owner update" on vendors for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and verified = (select verified from vendors v where v.id = vendors.id)   -- only admin verifies
    and hidden = (select hidden from vendors v where v.id = vendors.id));     -- only admin hides
create policy "vendors admin" on vendors for all using (is_admin()) with check (is_admin());

-- offers
create policy "offers read" on offers for select using (
  exists (select 1 from vendors v where v.id = vendor_id and (not v.hidden or v.owner_id = auth.uid() or is_admin())));
create policy "offers owner write" on offers for all using (owns_vendor(vendor_id) or is_admin())
  with check (owns_vendor(vendor_id) or is_admin());

-- availability: public read (needed to show free units), owner write
create policy "blocks read" on availability_blocks for select using (true);
create policy "blocks owner write" on availability_blocks for all
  using (owns_vendor((select vendor_id from offers o where o.id = offer_id)) or is_admin())
  with check (owns_vendor((select vendor_id from offers o where o.id = offer_id)) or is_admin());

-- events: client only
create policy "events own" on events for all using (client_id = auth.uid() or is_admin())
  with check (client_id = auth.uid());

-- bookings: client creates own; client + vendor owner read; status changes via RPC below
create policy "bookings read" on bookings for select
  using (client_id = auth.uid() or owns_vendor(vendor_id) or is_admin());
create policy "bookings insert" on bookings for insert
  with check (client_id = auth.uid() and status = 'pending');
create policy "bookings vendor update" on bookings for update
  using (owns_vendor(vendor_id) or is_admin()) with check (status <> 'pending');
-- Clients never update bookings directly: payment confirmation comes from the
-- payment provider webhook (service role), cancellation via a security-definer RPC.

-- conversations & messages: participants only
create policy "conversations participants" on conversations for select
  using (client_id = auth.uid() or owns_vendor(vendor_id) or is_admin());
create policy "conversations create" on conversations for insert
  with check (client_id = auth.uid() or owns_vendor(vendor_id));
create policy "messages read" on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id
          and (c.client_id = auth.uid() or owns_vendor(c.vendor_id) or is_admin())));
create policy "messages send" on messages for insert with check (
  sender_id = auth.uid() and system = false and
  exists (select 1 from conversations c where c.id = conversation_id
          and (c.client_id = auth.uid() or owns_vendor(c.vendor_id))));

-- reviews: public read, admin write (v1)
create policy "reviews read" on reviews for select using (true);
create policy "reviews admin" on reviews for all using (is_admin()) with check (is_admin());

-- favorites: own
create policy "favorites own" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- stats: vendor owner + admin
create policy "stats read" on vendor_stats for select using (owns_vendor(vendor_id) or is_admin());

-- Realtime for chat
alter publication supabase_realtime add table messages;

-- ═════════════════════════════════════════════════════════════
-- v3: social feed, P2P escrow, notifications, invitations v2
-- Mirrors lib/data/types.ts. Money moves only through the escrow
-- RPCs (security definer), never through direct table writes.
-- ═════════════════════════════════════════════════════════════

-- escrow on bookings
create type escrow_state as enum ('none', 'held', 'released', 'refunded', 'disputed');
alter table bookings
  add column escrow_state escrow_state not null default 'none',
  add column escrow_amount int,
  add column held_at timestamptz,
  add column client_confirmed_at timestamptz,
  add column vendor_confirmed_at timestamptz,
  add column released_at timestamptz,
  add column refunded_at timestamptz,
  add column dispute_by uuid references profiles(id),
  add column dispute_reason text,
  add column dispute_opened_at timestamptz,
  add column dispute_resolution text check (dispute_resolution in ('release', 'refund')),
  add column dispute_resolved_at timestamptz;

create type transaction_kind as enum ('hold', 'release', 'fee', 'refund', 'payout');
create table transactions (
  id uuid primary key default gen_random_uuid(),
  kind transaction_kind not null,
  amount int not null check (amount >= 0),
  booking_id uuid references bookings(id),
  vendor_id uuid references vendors(id),
  client_id uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);
create index on transactions (vendor_id, kind);

create table platform_settings (
  id boolean primary key default true check (id),  -- single row
  fee_percent int not null default 5 check (fee_percent between 0 and 30),
  default_prepay_percent int not null default 30 check (default_prepay_percent between 0 and 100),
  auto_release_days int not null default 3
);

-- feed
create table posts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors(id) on delete cascade,
  photos text[] not null,
  caption_ru text not null default '',
  caption_en text not null default '',
  category text not null references categories(id),
  offer_id uuid references offers(id) on delete set null,
  ratio real not null default 1.25,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index on posts (created_at desc);
create table post_likes (user_id uuid references profiles(id) on delete cascade, post_id uuid references posts(id) on delete cascade, primary key (user_id, post_id));
create table saved_posts (user_id uuid references profiles(id) on delete cascade, post_id uuid references posts(id) on delete cascade, primary key (user_id, post_id));
create table follows (user_id uuid references profiles(id) on delete cascade, vendor_id uuid references vendors(id) on delete cascade, primary key (user_id, vendor_id));

alter table reviews
  add column booking_id uuid unique references bookings(id),
  add column author_id uuid references profiles(id),
  add column reply_text text,
  add column reply_date date,
  add column hidden boolean not null default false;

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  text_ru text not null,
  text_en text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, created_at desc);

-- invitations: the page is a jsonb design (blocks + theme); guests, answers and views are rows
create table invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  event_id uuid references events(id) on delete set null,
  template_id text,
  occasion text not null,
  names text not null default '',
  date date,
  time text,
  venue text not null default '',
  address text not null default '',
  contact text,
  design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table invitation_guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  name text not null,
  phone text,
  "group" text,
  seats int not null default 1,
  sent_at timestamptz,
  opened_at timestamptz
);
create table invitation_rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references invitations(id) on delete cascade,
  guest_id uuid references invitation_guests(id) on delete set null,
  name text not null,
  attending boolean not null,
  guests int not null default 1,
  note text,
  created_at timestamptz not null default now()
);
create table invitation_views (
  invitation_id uuid not null references invitations(id) on delete cascade,
  guest_id uuid references invitation_guests(id) on delete set null,
  at timestamptz not null default now()
);

alter table transactions enable row level security;
alter table platform_settings enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table saved_posts enable row level security;
alter table follows enable row level security;
alter table notifications enable row level security;
alter table invitations enable row level security;
alter table invitation_rsvps enable row level security;
alter table invitation_guests enable row level security;
alter table invitation_views enable row level security;

create policy "tx read" on transactions for select using (client_id = auth.uid() or owns_vendor(vendor_id) or is_admin());
create policy "settings read" on platform_settings for select using (true);
create policy "settings admin" on platform_settings for update using (is_admin());
create policy "posts read" on posts for select using (not hidden or owns_vendor(vendor_id) or is_admin());
create policy "posts owner write" on posts for all using (owns_vendor(vendor_id) or is_admin()) with check (owns_vendor(vendor_id) or is_admin());
create policy "likes own" on post_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "likes count" on post_likes for select using (true);
create policy "saved own" on saved_posts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "follows own" on follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "follows count" on follows for select using (true);
create policy "notifications own" on notifications for select using (user_id = auth.uid());
create policy "notifications mark read" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "invitations public read" on invitations for select using (true); -- anyone with the link
create policy "invitations owner write" on invitations for all using (owner_id = auth.uid() or is_admin()) with check (owner_id = auth.uid());
create policy "rsvps owner read" on invitation_rsvps for select
  using (exists (select 1 from invitations i where i.id = invitation_id and (i.owner_id = auth.uid() or is_admin())));
create policy "guests owner" on invitation_guests for all
  using (exists (select 1 from invitations i where i.id = invitation_id and (i.owner_id = auth.uid() or is_admin())))
  with check (exists (select 1 from invitations i where i.id = invitation_id and i.owner_id = auth.uid()));
create policy "views owner read" on invitation_views for select
  using (exists (select 1 from invitations i where i.id = invitation_id and (i.owner_id = auth.uid() or is_admin())));
-- guests (anonymous) record views and RSVPs through security-definer RPCs, not direct inserts.

-- Escrow RPCs to implement server-side (same transitions as lib/payments/escrow.ts):
--   escrow_hold(booking)            — called by the payment webhook only
--   escrow_confirm(booking)         — caller must be the client or the vendor owner
--   escrow_refund(booking)          — before both confirmations
--   escrow_open_dispute(booking, reason)
--   escrow_resolve(booking, 'release' | 'refund') — admin only
-- Each runs in one transaction: update bookings + insert transactions rows.
