
create table public.hosts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  logo_url text,
  bio text,
  contact_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hosts enable row level security;

create policy "Hosts are viewable by everyone"
  on public.hosts for select
  using (true);

create policy "Users can create their own host"
  on public.hosts for insert
  with check (auth.uid() = profile_id);

create policy "Users can update their own host"
  on public.hosts for update
  using (auth.uid() = profile_id);

create policy "Users can delete their own host"
  on public.hosts for delete
  using (auth.uid() = profile_id);

-- Storage bucket for host logos
insert into storage.buckets (id, name, public)
values ('host-logos', 'host-logos', true);

create policy "Host logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'host-logos');

create policy "Users can upload their own host logo"
  on storage.objects for insert
  with check (
    bucket_id = 'host-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own host logo"
  on storage.objects for update
  using (
    bucket_id = 'host-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own host logo"
  on storage.objects for delete
  using (
    bucket_id = 'host-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
