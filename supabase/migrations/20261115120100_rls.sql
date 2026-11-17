-- EVENTUS — row level security. The same rules as lib/data/policies.ts.
--
-- Model
--   * anon (no session) reads the public catalog only: categories, settings, visible vendors/offers/posts/reviews
--   * authenticated users read and write their own rows; vendors their vendor's rows; admin everything
--   * multi-row or money writes (bookings, escrow, payouts, sign-up, verification) have NO table grants:
--     they go through security-definer functions in 20261115120200_rpc.sql
--   * columns users must not set themselves (role, blocked, verified, rating…) are guarded by triggers
--     in 20261115120300_triggers.sql — RLS decides which rows, the trigger decides which columns
--   * blocked users can read but not write user content
--
-- auth.uid() is wrapped in (select …) so Postgres evaluates it once per query, not per row.

-- ─────────────── Helpers (security definer: they read past RLS, return only a boolean/ids) ───────────────
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and not blocked)
$$;

create function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and not blocked)
$$;

create function public.owns_vendor(p_vendor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vendors where id = p_vendor and owner_id = (select auth.uid()))
$$;

create function public.vendor_visible(p_vendor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.vendors v
    where v.id = p_vendor and (not v.hidden or v.owner_id = (select auth.uid()) or public.is_admin())
  )
$$;

create function public.in_conversation(p_conversation uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation
      and (c.client_id = (select auth.uid()) or public.owns_vendor(c.vendor_id))
  )
$$;

-- A client with a finished deal with this vendor (completed, or money released and not cancelled)
create function public.has_finished_deal(p_vendor uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
    where b.client_id = (select auth.uid()) and b.vendor_id = p_vendor and b.status <> 'cancelled'
      and (b.status = 'completed' or b.escrow_state = 'released')
  )
$$;

-- ─────────────── Grants: start from nothing, open what the policies below need ───────────────
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;

grant execute on function public.is_ltext(jsonb), public.is_admin(), public.is_active_user(), public.owns_vendor(uuid),
  public.vendor_visible(uuid), public.in_conversation(uuid), public.has_finished_deal(uuid) to anon, authenticated;

-- public catalog
grant select on public.categories, public.platform_settings, public.vendors, public.offers, public.posts,
  public.post_comments, public.post_likes, public.reviews to anon, authenticated;

grant select, update on public.profiles to authenticated;
grant update on public.platform_settings to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update on public.vendors to authenticated;
grant insert, update, delete on public.offers to authenticated;
grant select, insert, update, delete on public.availability_blocks to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select on public.bookings, public.transactions, public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant insert, update on public.reviews to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, delete on public.post_comments to authenticated;
grant insert, delete on public.post_likes to authenticated;
grant select, insert, delete on public.post_saves, public.follows, public.favorites to authenticated;
grant select on public.vendor_stats to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.vendor_documents to authenticated;
grant select, insert, update on public.complaints to authenticated;
grant select, insert, update, delete on public.invitations, public.invitation_guests to authenticated;
grant select, delete on public.invitation_rsvps, public.invitation_views to authenticated;

-- ─────────────── Enable RLS everywhere ───────────────
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'platform_settings', 'categories', 'vendors', 'offers', 'availability_blocks', 'events', 'bookings',
    'transactions', 'conversations', 'messages', 'reviews', 'posts', 'post_comments', 'post_likes', 'post_saves',
    'follows', 'favorites', 'vendor_stats', 'notifications', 'vendor_documents', 'complaints', 'invitations',
    'invitation_guests', 'invitation_rsvps', 'invitation_views'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ─────────────── Policies ───────────────
-- profiles: own row (columns guarded by trigger); admin all. Others' names come from profile_cards().
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- settings and categories: everyone reads, admin writes
create policy settings_select on public.platform_settings for select to anon, authenticated using (true);
create policy settings_update on public.platform_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_select on public.categories for select to anon, authenticated using (true);
create policy categories_admin_insert on public.categories for insert to authenticated with check ((select public.is_admin()));
create policy categories_admin_update on public.categories for update to authenticated using ((select public.is_admin()));
create policy categories_admin_delete on public.categories for delete to authenticated using ((select public.is_admin()));

-- vendors: public unless hidden; owner edits own (columns guarded); admin creates and edits any.
-- Vendor sign-up goes through sign_up_vendor().
create policy vendors_select on public.vendors for select to anon, authenticated
  using (not hidden or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy vendors_insert on public.vendors for insert to authenticated with check ((select public.is_admin()));
create policy vendors_update on public.vendors for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check ((owner_id = (select auth.uid()) and (select public.is_active_user())) or (select public.is_admin()));

-- offers: visible with their vendor; owner/admin write
create policy offers_select on public.offers for select to anon, authenticated
  using (public.vendor_visible(vendor_id) and (active or public.owns_vendor(vendor_id) or (select public.is_admin())));
create policy offers_insert on public.offers for insert to authenticated
  with check ((public.owns_vendor(vendor_id) and (select public.is_active_user())) or (select public.is_admin()));
create policy offers_update on public.offers for update to authenticated
  using (public.owns_vendor(vendor_id) or (select public.is_admin()))
  with check ((public.owns_vendor(vendor_id) and (select public.is_active_user())) or (select public.is_admin()));
create policy offers_delete on public.offers for delete to authenticated
  using (public.owns_vendor(vendor_id) or (select public.is_admin()));

-- availability blocks: owner/admin; the public sees only free counts via offer_availability()
create policy blocks_all on public.availability_blocks for all to authenticated
  using (exists (select 1 from public.offers o where o.id = offer_id and (public.owns_vendor(o.vendor_id) or (select public.is_admin()))))
  with check (exists (select 1 from public.offers o where o.id = offer_id and (public.owns_vendor(o.vendor_id) or (select public.is_admin()))));

-- events: the client's own planning; admin reads
create policy events_select on public.events for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_admin()));
create policy events_write on public.events for all to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and (select public.is_active_user())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'client'));

-- bookings and the ledger: read by the parties and admin; written only by the booking/escrow functions
create policy bookings_select on public.bookings for select to authenticated
  using (client_id = (select auth.uid()) or public.owns_vendor(vendor_id) or (select public.is_admin()));
create policy transactions_select on public.transactions for select to authenticated
  using (client_id = (select auth.uid()) or (vendor_id is not null and public.owns_vendor(vendor_id)) or (select public.is_admin()));

-- chat: participants and admin read; participants send (not as system); threads are made by ensure_conversation()
create policy conversations_select on public.conversations for select to authenticated
  using (client_id = (select auth.uid()) or public.owns_vendor(vendor_id) or (select public.is_admin()));
create policy messages_select on public.messages for select to authenticated
  using (public.in_conversation(conversation_id) or (select public.is_admin()));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and not system and public.in_conversation(conversation_id) and (select public.is_active_user()));

-- reviews: public unless hidden; a client with a finished deal reviews it once; admin hides.
-- Vendor replies go through reply_to_review().
create policy reviews_select on public.reviews for select to anon, authenticated
  using (not hidden or author_id = (select auth.uid()) or public.owns_vendor(vendor_id) or (select public.is_admin()));
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    author_id = (select auth.uid()) and (select public.is_active_user())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.client_id = (select auth.uid()) and b.vendor_id = reviews.vendor_id
        and b.status <> 'cancelled' and (b.status = 'completed' or b.escrow_state = 'released')
    )
  );
create policy reviews_admin_update on public.reviews for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- feed
create policy posts_select on public.posts for select to anon, authenticated
  using ((not hidden and public.vendor_visible(vendor_id)) or public.owns_vendor(vendor_id) or (select public.is_admin()));
create policy posts_insert on public.posts for insert to authenticated
  with check ((public.owns_vendor(vendor_id) and (select public.is_active_user())) or (select public.is_admin()));
create policy posts_update on public.posts for update to authenticated
  using (public.owns_vendor(vendor_id) or (select public.is_admin()))
  with check (public.owns_vendor(vendor_id) or (select public.is_admin()));
create policy posts_delete on public.posts for delete to authenticated
  using (public.owns_vendor(vendor_id) or (select public.is_admin()));

create policy comments_select on public.post_comments for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
-- only people who really used the vendor: a client with a finished deal
create policy comments_insert on public.post_comments for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select public.is_active_user())
    and exists (select 1 from public.posts p where p.id = post_id and public.has_finished_deal(p.vendor_id))
  );
create policy comments_delete on public.post_comments for delete to authenticated
  using (
    user_id = (select auth.uid()) or (select public.is_admin())
    or exists (select 1 from public.posts p where p.id = post_id and public.owns_vendor(p.vendor_id))
  );

create policy likes_select on public.post_likes for select to anon, authenticated using (true);
create policy likes_insert on public.post_likes for insert to authenticated with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy likes_delete on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));

create policy saves_own on public.post_saves for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy favorites_own on public.favorites for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'client'));
-- a vendor sees who follows it
create policy follows_select on public.follows for select to authenticated
  using (user_id = (select auth.uid()) or public.owns_vendor(vendor_id) or (select public.is_admin()));
create policy follows_insert on public.follows for insert to authenticated with check (user_id = (select auth.uid()));
create policy follows_delete on public.follows for delete to authenticated using (user_id = (select auth.uid()));

-- views counter: owner/admin read; increments via track_view()
create policy stats_select on public.vendor_stats for select to authenticated
  using (public.owns_vendor(vendor_id) or (select public.is_admin()));

-- notifications: own; created only by triggers/functions; the user may mark them read
create policy notifications_select on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- verification papers: the vendor uploads/removes own pending ones; admin reviews
create policy documents_select on public.vendor_documents for select to authenticated
  using (public.owns_vendor(vendor_id) or (select public.is_admin()));
create policy documents_insert on public.vendor_documents for insert to authenticated
  with check (public.owns_vendor(vendor_id) and status = 'pending' and reviewed_at is null and (select public.is_active_user()));
create policy documents_delete on public.vendor_documents for delete to authenticated
  using ((public.owns_vendor(vendor_id) and status <> 'approved') or (select public.is_admin()));
create policy documents_admin_update on public.vendor_documents for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- complaints: clients and vendors report (own content refused by trigger); author sees own; admin resolves
create policy complaints_select on public.complaints for select to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));
create policy complaints_insert on public.complaints for insert to authenticated
  with check (
    author_id = (select auth.uid()) and status = 'open' and resolution is null and (select public.is_active_user())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('client', 'vendor'))
  );
create policy complaints_admin_update on public.complaints for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- invitations: the client's own; guests open them via public_invitation(), answer via submit_rsvp()
create policy invitations_owner on public.invitations for all to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (
    (owner_id = (select auth.uid()) and (select public.is_active_user())
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'client'))
    or (select public.is_admin())
  );
create policy invitation_guests_owner on public.invitation_guests for all to authenticated
  using (exists (select 1 from public.invitations i where i.id = invitation_id and (i.owner_id = (select auth.uid()) or (select public.is_admin()))))
  with check (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = (select auth.uid())));
create policy invitation_rsvps_owner on public.invitation_rsvps for select to authenticated
  using (exists (select 1 from public.invitations i where i.id = invitation_id and (i.owner_id = (select auth.uid()) or (select public.is_admin()))));
create policy invitation_rsvps_delete on public.invitation_rsvps for delete to authenticated
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = (select auth.uid())));
create policy invitation_views_owner on public.invitation_views for select to authenticated
  using (exists (select 1 from public.invitations i where i.id = invitation_id and (i.owner_id = (select auth.uid()) or (select public.is_admin()))));
create policy invitation_views_delete on public.invitation_views for delete to authenticated
  using (exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = (select auth.uid())));
