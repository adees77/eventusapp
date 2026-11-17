-- Vendor AI assistant in client ↔ vendor chats, and prices hidden until the chat.
-- Mirrors lib/data/types.ts: Vendor.aiAssistant, Message.ai / offerIds, PlatformSettings.hidePrices.

alter table public.vendors add column if not exists ai_assistant boolean not null default true;

alter table public.messages add column if not exists ai boolean not null default false;
alter table public.messages add column if not exists offer_ids text[] not null default '{}';

alter table public.platform_settings add column if not exists hide_prices boolean not null default true;

-- An AI message is written by the server (service role) on the vendor's behalf: clients and
-- vendors may not set `ai` themselves, so nobody can pass their own text off as the assistant's.
create or replace function public.guard_message_ai() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.ai or coalesce(array_length(new.offer_ids, 1), 0) > 0) and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'ai messages are written by the server';
  end if;
  return new;
end $$;

drop trigger if exists guard_message_ai on public.messages;
create trigger guard_message_ai before insert or update on public.messages
  for each row execute function public.guard_message_ai();

revoke execute on function public.guard_message_ai() from public, anon, authenticated;
