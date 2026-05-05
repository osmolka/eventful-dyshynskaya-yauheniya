
create type public.app_role as enum ('attendee', 'host', 'checker');

alter table public.profiles
  add column role public.app_role not null default 'attendee';
