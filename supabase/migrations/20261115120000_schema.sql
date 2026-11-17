-- EVENTUS — tables. Mirrors lib/data/types.ts (camelCase there, snake_case here).
-- Access rules: 20261115120100_rls.sql. Multi-row writes (bookings, escrow, sign-up): 20261115120200_rpc.sql.
-- Side effects (notifications, ratings, auto-hide, system messages): 20261115120300_triggers.sql.
--
-- Conventions
--   * ids are uuid; vendors also have a unique slug for URLs
--   * LText ({ru, en}) is jsonb, checked by is_ltext()
--   * money is integer KGS (сом); balances are never stored, always summed from `transactions`
--   * timestamps are timestamptz; calendar dates (booking day, event day) are date

create extension if not exists pgcrypto;

-- ─────────────── Types ───────────────
create type user_role as enum ('client', 'vendor', 'admin');
create type auth_provider as enum ('google', 'email', 'demo');
create type category_id as enum ('cars', 'halls', 'furniture', 'hosts', 'photo', 'decor', 'music', 'cakes', 'beauty', 'attire', 'traditional', 'shows');
create type booking_status as enum ('pending', 'prepaid', 'confirmed', 'completed', 'cancelled');
create type escrow_state as enum ('none', 'held', 'released', 'refunded', 'disputed');
create type dispute_resolution as enum ('release', 'refund');
create type transaction_kind as enum ('hold', 'release', 'fee', 'refund', 'payout');
create type doc_kind as enum ('passport', 'registration', 'license', 'contract');
create type doc_status as enum ('pending', 'approved', 'rejected');
create type verification_state as enum ('pending', 'rejected');
create type complaint_target as enum ('vendor', 'post', 'review');
create type complaint_reason as enum ('fraud', 'fake', 'offensive', 'spam', 'quality', 'other');
create type complaint_status as enum ('open', 'resolved', 'dismissed');
create type complaint_resolution as enum ('hidden', 'kept');
create type notification_kind as enum (
  'message', 'escrow_held', 'escrow_confirm', 'escrow_released', 'escrow_refunded', 'escrow_disputed',
  'booking_new', 'booking_status', 'rsvp', 'review', 'follow', 'system'
);
create type invitation_style as enum ('classic', 'minimal', 'night', 'arch', 'ornament', 'photo');
create type invitation_occasion as enum ('wedding', 'kyzUzatuu', 'birthday', 'jubilee', 'sunnot', 'corporate');

create function public.is_ltext(v jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(v) = 'object' and jsonb_typeof(v -> 'ru') = 'string' and jsonb_typeof(v -> 'en') = 'string'
$$;

-- ─────────────── People ───────────────
-- 1:1 with auth.users, created by the on_auth_user_created trigger
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'client',
  name text not null default '' check (length(name) <= 80),
  phone text check (length(phone) <= 30),
  avatar text,
  email text,
  auth_provider auth_provider,
  city text,
  needs_onboarding boolean not null default true,
  onboarded_at timestamptz,
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Singleton row with platform rules (admin edits them in /admin/settings)
create table public.platform_settings (
  id boolean primary key default true check (id),
  fee_percent numeric(5, 2) not null default 5 check (fee_percent between 0 and 50),
  default_prepay_percent int not null default 30 check (default_prepay_percent between 0 and 100),
  auto_release_days int not null default 3 check (auto_release_days >= 0),
  required_docs doc_kind[] not null default '{passport,registration}',
  auto_hide_complaints int not null default 3 check (auto_hide_complaints >= 0),
  low_rating_threshold int not null default 3 check (low_rating_threshold between 1 and 5),
  notify_on_complaint boolean not null default true,
  hide_unverified boolean not null default false,
  support_phone text not null default '',
  support_email text not null default ''
);

-- ─────────────── Catalog ───────────────
create table public.categories (
  id category_id primary key,
  name jsonb not null check (is_ltext(name)),
  icon text not null,
  sort_order int not null
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9а-яё-]{2,100}$'),
  name text not null check (length(name) between 1 and 80),
  category category_id not null references public.categories (id),
  city text not null,
  tagline jsonb not null default '{"ru":"","en":""}' check (is_ltext(tagline)),
  description jsonb not null default '{"ru":"","en":""}' check (is_ltext(description)),
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  reviews_count int not null default 0 check (reviews_count >= 0),
  verified boolean not null default false,
  hidden boolean not null default false,
  prepay_percent int not null default 30 check (prepay_percent between 0 and 100),
  cover text not null default '',
  portfolio text[] not null default '{}',
  phone text not null default '' check (length(phone) <= 30),
  instagram text,
  years_on_market int not null default 0 check (years_on_market >= 0),
  response_minutes int not null default 30 check (response_minutes >= 0),
  specs jsonb not null default '{}' check (jsonb_typeof(specs) = 'object'),
  orders_base int not null default 0 check (orders_base >= 0),
  -- verification request: set when the vendor sends documents, cleared when admin approves
  verification_state verification_state,
  verification_requested_at timestamptz,
  verification_note text,
  verification_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
-- one vendor profile per account (sign-up reuses it on retry)
create unique index vendors_owner_key on public.vendors (owner_id);
create index vendors_category_city_idx on public.vendors (category, city) where not hidden;

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  title jsonb not null check (is_ltext(title)),
  description jsonb not null default '{"ru":"","en":""}' check (is_ltext(description)),
  price int not null check (price >= 0),
  unit jsonb not null check (is_ltext(unit)),
  total_units int not null default 1 check (total_units >= 1),
  max_per_booking int check (max_per_booking >= 1),
  capacity int check (capacity >= 0),
  photos text[] not null default '{}',
  premium boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index offers_vendor_idx on public.offers (vendor_id);

-- Vendor-side manual blocking of units on a date (offline sales etc.)
create table public.availability_blocks (
  offer_id uuid not null references public.offers (id) on delete cascade,
  date date not null,
  units int not null check (units >= 0),
  primary key (offer_id, date)
);

-- ─────────────── Client planning ───────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  date date not null,
  city text not null,
  guests int not null default 0 check (guests >= 0),
  budget int not null default 0 check (budget >= 0),
  -- [{id, title, done, category?}] — small, always edited as a whole
  checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array'),
  created_at timestamptz not null default now()
);
create index events_client_idx on public.events (client_id);

-- ─────────────── Bookings + escrow ───────────────
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id),
  vendor_id uuid not null references public.vendors (id),
  client_id uuid not null references public.profiles (id),
  event_id uuid references public.events (id) on delete set null,
  date date not null,
  qty int not null check (qty >= 1),
  total int not null check (total >= 0),
  prepay_amount int not null check (prepay_amount >= 0 and prepay_amount <= total),
  status booking_status not null default 'pending',
  payment_ref text,
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  -- P2P escrow: the prepayment is frozen until both sides confirm the deal
  escrow_state escrow_state not null default 'none',
  escrow_amount int not null default 0 check (escrow_amount >= 0),
  held_at timestamptz,
  client_confirmed_at timestamptz,
  vendor_confirmed_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  dispute_by uuid references public.profiles (id),
  dispute_reason text check (length(dispute_reason) <= 600),
  dispute_opened_at timestamptz,
  dispute_resolution dispute_resolution,
  dispute_resolved_at timestamptz
);
create index bookings_offer_date_idx on public.bookings (offer_id, date);
create index bookings_client_idx on public.bookings (client_id);
create index bookings_vendor_idx on public.bookings (vendor_id);

-- Money ledger: append-only, written only by the escrow functions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind transaction_kind not null,
  amount int not null check (amount >= 0),
  booking_id uuid references public.bookings (id),
  vendor_id uuid references public.vendors (id),
  client_id uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);
create index transactions_vendor_idx on public.transactions (vendor_id);
create index transactions_booking_idx on public.transactions (booking_id);

-- ─────────────── Chat ───────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  booking_id uuid unique references public.bookings (id) on delete set null,
  client_read_at timestamptz,
  vendor_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- one general (not booking-bound) thread per client/vendor pair
create unique index conversations_pair_key on public.conversations (client_id, vendor_id) where booking_id is null;
create index conversations_vendor_idx on public.conversations (vendor_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- null for system messages (escrow events); text then holds the event code
  sender_id uuid references public.profiles (id) on delete set null,
  text text not null check (length(text) between 1 and 4000),
  system boolean not null default false,
  created_at timestamptz not null default now(),
  check (system or sender_id is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ─────────────── Reviews ───────────────
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  booking_id uuid unique references public.bookings (id) on delete set null,
  author_id uuid references public.profiles (id) on delete set null,
  author text not null,
  rating int not null check (rating between 1 and 5),
  text jsonb not null check (is_ltext(text)),
  date date not null default current_date,
  reply_text text check (length(reply_text) <= 1000),
  reply_date date,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index reviews_vendor_idx on public.reviews (vendor_id);

-- ─────────────── Feed ───────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  photos text[] not null check (cardinality(photos) between 1 and 10),
  caption jsonb not null check (is_ltext(caption)),
  category category_id not null,
  offer_id uuid references public.offers (id) on delete set null,
  base_likes int not null default 0 check (base_likes >= 0),
  ratio numeric(4, 3) not null default 1.25 check (ratio between 0.5 and 2.5),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index posts_vendor_idx on public.posts (vendor_id);
create index posts_feed_idx on public.posts (created_at desc) where not hidden;

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  author text not null,
  text text not null check (length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id);

create table public.post_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  primary key (user_id, post_id)
);
create table public.post_saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  primary key (user_id, post_id)
);
create table public.follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  primary key (user_id, vendor_id)
);
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  primary key (user_id, vendor_id)
);
create table public.vendor_stats (
  vendor_id uuid primary key references public.vendors (id) on delete cascade,
  views int not null default 0
);

-- ─────────────── Notifications ───────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind notification_kind not null,
  text jsonb not null check (is_ltext(text)),
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ─────────────── Moderation ───────────────
create table public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  kind doc_kind not null,
  file_name text not null check (length(file_name) between 1 and 200),
  -- Storage object path (bucket «documents»), set when uploads move to Storage
  storage_path text,
  status doc_status not null default 'pending',
  note text check (length(note) <= 300),
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index vendor_documents_vendor_idx on public.vendor_documents (vendor_id);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  target complaint_target not null,
  target_id uuid not null,
  -- the vendor the content belongs to (set by trigger), for grouping
  vendor_id uuid references public.vendors (id) on delete cascade,
  reason complaint_reason not null,
  text text check (length(text) <= 500),
  status complaint_status not null default 'open',
  resolution complaint_resolution,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
-- one open report per person per thing
create unique index complaints_open_key on public.complaints (author_id, target_id) where status = 'open';
create index complaints_target_idx on public.complaints (target_id) where status = 'open';

-- ─────────────── Invitations ───────────────
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  template_id text,
  style invitation_style not null,
  occasion invitation_occasion not null,
  heading text not null default '',
  names text not null default '' check (length(names) <= 80),
  message text not null default '',
  date date,
  time text not null default '',
  venue text not null default '' check (length(venue) <= 80),
  address text not null default '' check (length(address) <= 120),
  dress_code text,
  contact text,
  photo text,
  -- {theme, blocks[]} — the editor always saves it whole
  design jsonb not null check (jsonb_typeof(design) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invitations_owner_idx on public.invitations (owner_id);

create table public.invitation_guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  phone text,
  "group" text,
  seats int not null default 1 check (seats between 1 and 50),
  sent_at timestamptz,
  opened_at timestamptz,
  -- added by the host without sending an invitation
  direct boolean not null default false
);
create index invitation_guests_inv_idx on public.invitation_guests (invitation_id);

create table public.invitation_rsvps (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  guest_id uuid references public.invitation_guests (id) on delete set null,
  name text not null check (length(name) between 1 and 80),
  attending boolean not null,
  guests int not null default 1 check (guests between 0 and 50),
  note text check (length(note) <= 500),
  created_at timestamptz not null default now()
);
create index invitation_rsvps_inv_idx on public.invitation_rsvps (invitation_id);

create table public.invitation_views (
  id bigint generated always as identity primary key,
  invitation_id uuid not null references public.invitations (id) on delete cascade,
  guest_id uuid references public.invitation_guests (id) on delete set null,
  at timestamptz not null default now()
);
create index invitation_views_inv_idx on public.invitation_views (invitation_id);

-- ─────────────── Reference data ───────────────
insert into public.platform_settings (id, support_phone, support_email) values (true, '+996 555 000 777', 'support@eventus.kg');

insert into public.categories (id, name, icon, sort_order) values
  ('cars', '{"ru":"Кортежи","en":"Motorcades"}', 'car', 1),
  ('halls', '{"ru":"Банкетные залы","en":"Banquet halls"}', 'landmark', 2),
  ('hosts', '{"ru":"Ведущие","en":"Hosts"}', 'mic', 3),
  ('photo', '{"ru":"Фото и видео","en":"Photo & video"}', 'camera', 4),
  ('decor', '{"ru":"Декор и флористика","en":"Decor & florals"}', 'flower', 5),
  ('music', '{"ru":"Музыка и артисты","en":"Music & artists"}', 'music', 6),
  ('furniture', '{"ru":"Мебель и столы","en":"Furniture & tables"}', 'armchair', 7),
  ('cakes', '{"ru":"Торты","en":"Cakes"}', 'cake', 8),
  ('beauty', '{"ru":"Визаж и причёски","en":"Makeup & hair"}', 'sparkle', 9),
  ('attire', '{"ru":"Платья и костюмы","en":"Dresses & suits"}', 'shirt', 10),
  ('traditional', '{"ru":"Той-атрибутика","en":"Traditional items"}', 'tent', 11),
  ('shows', '{"ru":"Шоу и фейерверки","en":"Shows & fireworks"}', 'flame', 12);
