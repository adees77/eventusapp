-- Platform renamed EVENTUS → EVENTUS AI (domain eventusai.app): support address and the dispute notification text.
alter table public.platform_settings alter column support_email set default 'support@eventusai.app';
update public.platform_settings set support_email = 'support@eventusai.app' where support_email in ('', 'support@eventus.kg');

create or replace function public.on_booking_change() returns trigger
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
        perform public._notify(u, 'escrow_disputed', 'Открыт спор по сделке — деньги заморожены до решения EVENTUS AI',
          'A dispute was opened — money stays frozen until EVENTUS AI decides', href) from unnest(array[new.client_id, owner]) u;
        for a in select id from public.profiles where role = 'admin' loop
          perform public._notify(a, 'escrow_disputed', 'Открыт спор по сделке — деньги заморожены до решения EVENTUS AI',
            'A dispute was opened — money stays frozen until EVENTUS AI decides', '/admin/disputes');
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
