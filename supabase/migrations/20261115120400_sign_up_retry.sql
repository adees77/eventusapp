-- sign_up_vendor retry fix (found by supabase/tests/smoke.sql):
--   * a retry without photos kept the vendor's earlier portfolio/cover instead of wiping them
--   * a retry no longer adds a second first-service and first-post
--   * the first post is made only when there is at least one photo
create or replace function public.sign_up_vendor(p jsonb) returns jsonb
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
    phone = excluded.phone, specs = excluded.specs,
    portfolio = case when cardinality(excluded.portfolio) > 0 then excluded.portfolio else t.portfolio end,
    cover = coalesce(nullif(excluded.cover, ''), t.cover)
  returning * into v;

  select id into v_offer from public.offers where vendor_id = v.id order by created_at limit 1;
  if v_offer is null then
    insert into public.offers (vendor_id, title, description, price, unit, photos)
    values (v.id,
            jsonb_build_object('ru', left(btrim(p -> 'offer' ->> 'title'), 120), 'en', left(btrim(p -> 'offer' ->> 'title'), 120)),
            '{"ru":"","en":""}', greatest(0, coalesce((p -> 'offer' ->> 'price')::int, 0)), p -> 'offer' -> 'unit', v_photos[1:1])
    returning id into v_offer;
  end if;

  select id into v_post from public.posts where vendor_id = v.id order by created_at limit 1;
  if v_post is null and cardinality(coalesce(nullif(v_photos, '{}'), v.portfolio[1:3])) > 0 then
    insert into public.posts (vendor_id, photos, caption, category, offer_id, ratio)
    values (v.id, coalesce(nullif(v_photos, '{}'), v.portfolio[1:3]),
            jsonb_build_object('ru', v_tagline, 'en', v_tagline), v.category, v_offer, 1.25)
    returning id into v_post;
  end if;

  return jsonb_build_object('vendor_id', v.id, 'slug', v.slug, 'offer_id', v_offer, 'post_id', v_post);
end $$;
