
-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  display_name text not null,
  emoji text not null default '🚀',
  color text not null default '#A3E635',
  role text,
  company text,
  linkedin text,
  email text,
  goal text,
  track text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_all_auth" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = auth.uid());
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (user_id = auth.uid());

-- Events (persistent rooms)
create table public.events (
  id text primary key,
  code text not null unique,
  title text not null,
  host text not null,
  date_label text not null,
  status text not null check (status in ('live','upcoming','past')),
  color text not null default '#A3E635',
  attendees int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "events_select_all_auth" on public.events for select to authenticated using (true);

-- Event messages (persistent room chat)
create table public.event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.event_messages enable row level security;
create policy "event_messages_select_auth" on public.event_messages for select to authenticated using (true);
create policy "event_messages_insert_own" on public.event_messages
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())
  );
create index on public.event_messages(event_id, created_at desc);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  emojis text[] := array['🦊','🐼','🐯','🦉','🐙','🦁','🦄','🐸','🐢','🐧','🦋','🐺','🚀','🦊','🐳','🦅'];
  colors text[] := array['#A3E635','#60A5FA','#F59E0B','#F472B6','#34D399','#C084FC','#FB7185','#22D3EE','#FCD34D','#A78BFA'];
begin
  insert into public.profiles (user_id, display_name, email, emoji, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    emojis[1 + floor(random() * array_length(emojis, 1))::int],
    colors[1 + floor(random() * array_length(colors, 1))::int]
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Realtime
alter publication supabase_realtime add table public.event_messages;
