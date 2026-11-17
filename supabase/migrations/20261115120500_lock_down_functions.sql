-- Security fix (found by the Supabase security advisor):
-- migrations run as supabase_admin, whose default privileges let anon/authenticated EXECUTE every new
-- function — so internal helpers like _release() (pays out escrow) and confirm_booking_payment()
-- (marks a booking paid) were callable by anyone through /rest/v1/rpc. The earlier
-- `alter default privileges` only covered the postgres role.
--
-- RULE for every future migration: after creating functions, revoke EXECUTE from public/anon/authenticated
-- and grant it back only to the functions meant to be called by the app (see the list below).

revoke execute on all functions in schema public from public, anon, authenticated;

-- used inside RLS policies and CHECK constraints, so the caller needs EXECUTE; they only answer about the caller
grant execute on function public.is_ltext(jsonb), public.is_admin(), public.is_active_user(), public.owns_vendor(uuid),
  public.vendor_visible(uuid), public.in_conversation(uuid), public.has_finished_deal(uuid) to anon, authenticated;

-- public API without an account
grant execute on function
  public.offer_availability(uuid, date, date), public.public_invitation(uuid, uuid),
  public.submit_rsvp(uuid, text, boolean, int, text, uuid), public.record_invitation_view(uuid, uuid), public.track_view(uuid)
to anon, authenticated;

-- signed-in API (each function checks the caller itself)
grant execute on function
  public.create_booking(uuid, date, int, uuid, text), public.confirm_deal(uuid), public.unconfirm_deal(uuid),
  public.cancel_deal(uuid), public.open_dispute(uuid, text), public.resolve_dispute(uuid, public.dispute_resolution),
  public.set_booking_status(uuid, public.booking_status), public.request_payout(uuid, int),
  public.ensure_conversation(uuid, uuid), public.mark_read(uuid), public.profile_cards(uuid[]),
  public.reply_to_review(uuid, text), public.sign_up_vendor(jsonb), public.complete_client_onboarding(jsonb),
  public.request_verification(uuid), public.decide_verification(uuid, boolean, text), public.resolve_complaint(uuid, boolean)
to authenticated;

-- payment webhook and cron only (service_role keeps EXECUTE on everything)
grant execute on all functions in schema public to service_role;

-- fixed search_path on the remaining functions (advisor: function_search_path_mutable)
alter function public.is_ltext(jsonb) set search_path = '';
alter function public._deny(text) set search_path = '';
alter function public.touch_updated_at() set search_path = '';

-- events: one permissive policy per action (advisor: multiple_permissive_policies)
drop policy events_write on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (client_id = (select auth.uid()) and (select public.is_active_user())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'client'));
create policy events_update on public.events for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()) and (select public.is_active_user()));
create policy events_delete on public.events for delete to authenticated using (client_id = (select auth.uid()));

-- indexes for foreign keys the app filters or cascades on (advisor: unindexed_foreign_keys)
create index favorites_vendor_idx on public.favorites (vendor_id);
create index follows_vendor_idx on public.follows (vendor_id);
create index post_likes_post_idx on public.post_likes (post_id);
create index post_saves_post_idx on public.post_saves (post_id);
create index complaints_vendor_idx on public.complaints (vendor_id);
create index bookings_event_idx on public.bookings (event_id);
create index invitations_event_idx on public.invitations (event_id);
create index posts_offer_idx on public.posts (offer_id);
create index reviews_author_idx on public.reviews (author_id);
create index transactions_client_idx on public.transactions (client_id);
