
create type public.event_visibility as enum ('public', 'unlisted');

alter table public.events
  add column visibility public.event_visibility not null default 'public';

drop policy if exists "Events are viewable by everyone" on public.events;

create policy "Published events are viewable by everyone"
  on public.events for select
  using (status = 'published');

create policy "Hosts can view their own events"
  on public.events for select
  using (
    exists (
      select 1 from public.hosts h
      where h.id = host_id and h.profile_id = auth.uid()
    )
  );
