-- A confirmed email change in Supabase Auth reaches the profile too
-- (profiles.email is guarded from the client, so only this trigger moves it).
create function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end $$;

revoke execute on function public.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_profile_email();
