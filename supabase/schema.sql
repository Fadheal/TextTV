create table if not exists public.display_state (
  id integer primary key check (id = 1),
  text text not null default '',
  font_size integer not null default 100,
  video_url text,
  updated_at timestamptz not null default now()
);

alter table public.display_state
  add column if not exists font_size integer not null default 100;

alter table public.display_state
  add column if not exists video_url text;

insert into public.display_state (id, text)
values (1, '')
on conflict (id) do nothing;

alter table public.display_state enable row level security;

drop policy if exists "Display text is publicly readable" on public.display_state;
create policy "Display text is publicly readable"
  on public.display_state
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can update display text" on public.display_state;
drop policy if exists "Display text is publicly writable" on public.display_state;
create policy "Display text is publicly writable"
  on public.display_state
  for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, update on public.display_state to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'display_state'
  ) then
    alter publication supabase_realtime add table public.display_state;
  end if;
end
$$;
