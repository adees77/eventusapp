-- EVENTUS — triggers: what happens on its own after a write.
--   * a profile for every new auth user
--   * column guards: users can't set their own role/blocked, vendors can't set verified/rating/hidden
--   * chat: thread order and unread markers, notification to the other side
--   * deal events (escrow/status) → system message in the booking thread + notifications
--   * reviews → vendor rating; complaints → auto-hide and admin notification; RSVP → host notification
-- Notification texts and hrefs match lib/data/actions/* and lib/routes.ts.

-- ─────────────── Helpers ───────────────
create function public._notify(p_user uuid, p_kind public.notification_kind, p_ru text, p_en text, p_href text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, text, href)
  select p_user, p_kind, jsonb_build_object('ru', p_ru, 'en', p_en), p_href where p_user is not null
$$;

create function public._system_message(p_booking uuid, p_code text) returns void
language sql security definer set search_path = '' as $$
  insert into public.messages (conversation_id, sender_id, text, system)
  select id, null, p_code, true from public.conversations where booking_id = p_booking
$$;

-- Column guards below are SECURITY INVOKER on purpose: `current_user` is then 'authenticated' for a write
-- that came straight from the API (PostgREST), and the function owner for writes made inside our
-- security-definer functions (sign-up, verification, ratings) — only the first kind is guarded.

-- ─────────────── New user → profile ───────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name, email, avatar, auth_provider)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    case new.raw_app_meta_data ->> 'provider' when 'google' then 'google'::public.auth_provider else 'email'::public.auth_provider end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────── Column guards ───────────────
create function public.guard_profile_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.role is distinct from old.role or new.blocked is distinct from old.blocked
       or new.needs_onboarding is distinct from old.needs_onboarding or new.onboarded_at is distinct from old.onboarded_at
       or new.email is distinct from old.email or new.auth_provider is distinct from old.auth_provider
       or new.created_at is distinct from old.created_at then
      raise exception 'access denied: profile column' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_profile_columns before update on public.profiles
  for each row execute function public.guard_profile_columns();

create function public.guard_vendor_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.owner_id is distinct from old.owner_id or new.slug is distinct from old.slug
       or new.rating is distinct from old.rating or new.reviews_count is distinct from old.reviews_count
       or new.verified is distinct from old.verified or new.hidden is distinct from old.hidden
       or new.orders_base is distinct from old.orders_base or new.category is distinct from old.category
       or new.verification_state is distinct from old.verification_state
       or new.verification_requested_at is distinct from old.verification_requested_at
       or new.verification_note is distinct from old.verification_note
       or new.verification_reviewed_at is distinct from old.verification_reviewed_at then
      raise exception 'access denied: vendor column' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_vendor_columns before update on public.vendors
  for each row execute function public.guard_vendor_columns();

-- a hidden post can be brought back only by admin; base likes are seeded, not user-set
create function public.guard_post_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if (tg_op = 'UPDATE' and (new.hidden is distinct from old.hidden or new.base_likes is distinct from old.base_likes or new.vendor_id is distinct from old.vendor_id))
       or (tg_op = 'INSERT' and (new.hidden or new.base_likes <> 0)) then
      raise exception 'access denied: post column' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger guard_post_columns before insert or update on public.posts
  for each row execute function public.guard_post_columns();

-- the author name on a review/comment is the account's name, not free text
create function public.stamp_author() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.author := coalesce(nullif((select name from public.profiles where id = auth.uid()), ''), 'Клиент');
  end if;
  return new;
end $$;
create trigger stamp_review_author before insert on public.reviews for each row execute function public.stamp_author();
create trigger stamp_comment_author before insert on public.post_comments for each row execute function public.stamp_author();

create function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
create trigger invitations_updated_at before update on public.invitations for each row execute function public.touch_updated_at();

-- ─────────────── Chat ───────────────
create function public.on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.conversations;
begin
  update public.conversations
     set updated_at = new.created_at,
         client_read_at = case when new.sender_id = client_id then new.created_at else client_read_at end,
         vendor_read_at = case when not new.system and new.sender_id <> client_id then new.created_at else vendor_read_at end
   where id = new.conversation_id
  returning * into c;
  if not new.system then
    perform public._notify(
      case when new.sender_id = c.client_id then (select owner_id from public.vendors where id = c.vendor_id) else c.client_id end,
      'message', 'Новое сообщение', 'New message', '/messages/' || c.id);
  end if;
  return new;
end $$;
create trigger on_message after insert on public.messages for each row execute function public.on_message();

-- ─────────────── Deal events ───────────────
create function public.on_booking_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  owner uuid := (select owner_id from public.vendors where id = new.vendor_id);
  conv uuid := (select id from public.conversations where booking_id = new.id);
  href text := case when conv is null then null else '/messages/' || conv end;
  a uuid;
begin
  if tg_op = 'INSERT' then return new; end if;

  if new.escrow_state is distinct from old.escrow_state then
    case new.escrow_state
      when 'held' then
        perform public._system_message(new.id, 'escrow_held');
        perform public._notify(owner, 'booking_new', 'Новая бронь: предоплата заморожена до подтверждения сделки',
          'New booking: prepayment is frozen until the deal is confirmed', href);
      when 'released' then
        perform public._system_message(new.id, 'escrow_released');
        perform public._notify(u, 'escrow_released',
          case when old.escrow_state = 'disputed' then 'Спор решён: деньги переведены исполнителю' else 'Сделка подтверждена обеими сторонами, деньги переведены исполнителю' end,
          case when old.escrow_state = 'disputed' then 'Dispute resolved: money released to the vendor' else 'Both sides confirmed: money was transferred to the vendor' end,
          href) from unnest(array[new.client_id, owner]) u;
      when 'refunded' then
        perform public._system_message(new.id, 'escrow_refunded');
        perform public._notify(u, 'escrow_refunded',
          case when old.escrow_state = 'disputed' then 'Спор решён: предоплата возвращена клиенту' else 'Бронь отменена, предоплата возвращена клиенту' end,
          case when old.escrow_state = 'disputed' then 'Dispute resolved: prepayment refunded to the client' else 'Booking cancelled, the prepayment was returned to the client' end,
          href) from unnest(array[new.client_id, owner]) u;
      when 'disputed' then
        perform public._system_message(new.id, 'escrow_disputed');
        perform public._notify(u, 'escrow_disputed', 'Открыт спор по сделке — деньги заморожены до решения EVENTUS',
          'A dispute was opened — money stays frozen until EVENTUS decides', href) from unnest(array[new.client_id, owner]) u;
        for a in select id from public.profiles where role = 'admin' loop
          perform public._notify(a, 'escrow_disputed', 'Открыт спор по сделке — деньги заморожены до решения EVENTUS',
            'A dispute was opened — money stays frozen until EVENTUS decides', '/admin/disputes');
        end loop;
      else null;
    end case;
    return new;
  end if;

  -- one side confirmed, the money is still held
  if new.escrow_state = 'held' and new.client_confirmed_at is not null and old.client_confirmed_at is null then
    perform public._system_message(new.id, 'escrow_confirmed_client');
    perform public._notify(owner, 'escrow_confirm', 'Вторая сторона подтвердила сделку — осталось ваше подтверждение',
      'The other side confirmed the deal — your confirmation is next', href);
  end if;
  if new.escrow_state = 'held' and new.vendor_confirmed_at is not null and old.vendor_confirmed_at is null then
    perform public._system_message(new.id, 'escrow_confirmed_vendor');
    perform public._notify(new.client_id, 'escrow_confirm', 'Вторая сторона подтвердила сделку — осталось ваше подтверждение',
      'The other side confirmed the deal — your confirmation is next', href);
  end if;

  -- status changes outside the escrow
  if new.status is distinct from old.status then
    if new.status in ('confirmed', 'cancelled', 'completed') then
      perform public._system_message(new.id, 'booking_' || new.status);
    end if;
    perform public._notify(new.client_id, 'booking_status', 'Статус брони обновлён', 'Booking status updated', coalesce(href, '/dashboard/bookings'));
  end if;
  return new;
end $$;
create trigger on_booking_change after update on public.bookings for each row execute function public.on_booking_change();

-- ─────────────── Reviews → rating ───────────────
create function public.refresh_vendor_rating() returns trigger
language plpgsql security definer set search_path = '' as $$
declare vid uuid := coalesce(new.vendor_id, old.vendor_id);
begin
  update public.vendors v
     set rating = coalesce((select round(avg(r.rating), 1) from public.reviews r where r.vendor_id = vid and not r.hidden), 0),
         reviews_count = (select count(*) from public.reviews r where r.vendor_id = vid and not r.hidden)
   where v.id = vid;
  if tg_op = 'INSERT' then
    perform public._notify(
      (select owner_id from public.vendors where id = new.vendor_id), 'review',
      'Новый отзыв: ' || new.rating || ' из 5', 'New review: ' || new.rating || ' of 5',
      '/vendors/' || (select slug from public.vendors where id = new.vendor_id) || '?tab=reviews');
  end if;
  return null;
end $$;
create trigger refresh_vendor_rating after insert or delete or update of rating, hidden on public.reviews
  for each row execute function public.refresh_vendor_rating();

-- ─────────────── Complaints ───────────────
-- Fill the vendor the content belongs to; refuse reports on your own content
create function public.complaint_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.vendor_id := case new.target
    when 'vendor' then (select id from public.vendors where id = new.target_id)
    when 'post' then (select vendor_id from public.posts where id = new.target_id)
    when 'review' then (select vendor_id from public.reviews where id = new.target_id)
  end;
  if new.vendor_id is null then raise exception 'complaint target not found' using errcode = 'P0002'; end if;
  if (select owner_id from public.vendors where id = new.vendor_id) = new.author_id then
    raise exception 'access denied: report' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger complaint_before_insert before insert on public.complaints for each row execute function public.complaint_before_insert();

-- Enough open reports hide the thing until admin looks; admins are told about every report
create function public.complaint_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  s public.platform_settings := (select x from public.platform_settings x);
  a uuid;
begin
  if s.auto_hide_complaints > 0
     and (select count(*) from public.complaints where target_id = new.target_id and status = 'open') >= s.auto_hide_complaints then
    perform public._set_target_hidden(new.target, new.target_id, true);
  end if;
  if s.notify_on_complaint then
    for a in select id from public.profiles where role = 'admin' loop
      perform public._notify(a, 'system', 'Новая жалоба', 'New complaint', '/admin/complaints');
    end loop;
  end if;
  return null;
end $$;
create trigger complaint_after_insert after insert on public.complaints for each row execute function public.complaint_after_insert();

-- ─────────────── Invitations ───────────────
create function public.on_rsvp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public._notify(
    (select owner_id from public.invitations where id = new.invitation_id), 'rsvp',
    new.name || case when new.attending then ' придёт' else ' не сможет прийти' end,
    new.name || case when new.attending then ' is coming' else ' can''t come' end,
    '/invitations/' || new.invitation_id || '?tab=stats');
  return null;
end $$;
create trigger on_rsvp after insert on public.invitation_rsvps for each row execute function public.on_rsvp();

-- Trigger functions are never called directly
revoke execute on function public.handle_new_user(), public.guard_profile_columns(), public.guard_vendor_columns(),
  public.guard_post_columns(), public.stamp_author(), public.touch_updated_at(), public.on_message(),
  public.on_booking_change(), public.refresh_vendor_rating(), public.complaint_before_insert(),
  public.complaint_after_insert(), public.on_rsvp(), public._notify(uuid, public.notification_kind, text, text, text),
  public._system_message(uuid, text)
from public, anon, authenticated;

-- ─────────────── Schedules (pg_cron) ───────────────
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('eventus-auto-release', '15 3 * * *', $$select public.auto_release_due_deals()$$);
