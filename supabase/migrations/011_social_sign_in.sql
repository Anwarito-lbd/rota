-- 011 — Sign in with Apple and Google.
--
-- The original handle_new_user() requires a username in the sign-up
-- metadata and fails otherwise (on purpose: a taken username must refuse the
-- e-mail sign-up). Apple and Google sign-ins carry no username, so for them
-- we derive a free one from the e-mail (or "membre") plus four digits and
-- mark it as not yet chosen; the app asks the member to pick their own.
-- E-mail sign-ups behave exactly as before.

alter table public.profiles
  add column username_confirmed boolean not null default true;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(nullif(new.raw_user_meta_data ->> 'username', ''));
  base text;
  candidate text;
  tries integer := 0;
begin
  if wanted is not null then
    -- E-mail sign-up: the chosen username or nothing (unchanged behaviour).
    insert into public.profiles (id, username) values (new.id, wanted);
    return new;
  end if;

  base := regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9._]', '', 'g');
  base := left(base, 14);
  if char_length(base) < 3 or base in ('admin', 'rota', 'support', 'moderation', 'help') then
    base := 'membre';
  end if;

  loop
    candidate := base || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.profiles where username = candidate);
    tries := tries + 1;
    if tries > 20 then
      candidate := left(base, 10) || substr(replace(new.id::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;

  insert into public.profiles (id, username, username_confirmed) values (new.id, candidate, false);
  return new;
end;
$$;

-- Members confirm (or change) the generated username once. Username changes
-- go through the existing profile update policy; this only clears the flag.
create function public.confirm_username()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set username_confirmed = true where id = auth.uid();
$$;

revoke execute on function public.confirm_username() from public, anon;
grant execute on function public.confirm_username() to authenticated;
