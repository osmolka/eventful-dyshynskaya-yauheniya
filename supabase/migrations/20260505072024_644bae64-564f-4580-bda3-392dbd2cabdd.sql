
create type public.event_status as enum ('draft', 'published');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  time_zone text not null,
  venue_address text,
  online_link text,
  capacity integer not null check (capacity >= 0),
  cover_image_url text,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at),
  check (venue_address is not null or online_link is not null)
);

create index events_host_id_idx on public.events(host_id);

alter table public.events enable row level security;

create policy "Events are viewable by everyone"
  on public.events for select
  using (true);

create policy "Hosts can create their own events"
  on public.events for insert
  with check (
    exists (
      select 1 from public.hosts h
      where h.id = host_id and h.profile_id = auth.uid()
    )
  );

create policy "Hosts can update their own events"
  on public.events for update
  using (
    exists (
      select 1 from public.hosts h
      where h.id = host_id and h.profile_id = auth.uid()
    )
  );

create policy "Hosts can delete their own events"
  on public.events for delete
  using (
    exists (
      select 1 from public.hosts h
      where h.id = host_id and h.profile_id = auth.uid()
    )
  );

-- Storage bucket for event cover images
insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true);

create policy "Event covers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'event-covers');

create policy "Users can upload their own event cover"
  on storage.objects for insert
  with check (
    bucket_id = 'event-covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own event cover"
  on storage.objects for update
  using (
    bucket_id = 'event-covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own event cover"
  on storage.objects for delete
  using (
    bucket_id = 'event-covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
