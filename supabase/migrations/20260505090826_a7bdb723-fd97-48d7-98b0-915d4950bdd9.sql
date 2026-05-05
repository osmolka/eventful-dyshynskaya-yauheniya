
-- Create demo auth users (idempotent)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_sso_user
)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'demo-host@example.com',
   crypt('DemoPass123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Demo Host"}'::jsonb,
   false),
  ('22222222-2222-2222-2222-222222222222',
   '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated',
   'demo-attendee@example.com',
   crypt('DemoPass123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"display_name":"Demo Attendee"}'::jsonb,
   false)
ON CONFLICT (id) DO NOTHING;

-- Identities (needed for password sign-in)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   jsonb_build_object('sub','11111111-1111-1111-1111-111111111111','email','demo-host@example.com','email_verified',true),
   'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   jsonb_build_object('sub','22222222-2222-2222-2222-222222222222','email','demo-attendee@example.com','email_verified',true),
   'email', now(), now(), now())
ON CONFLICT DO NOTHING;

-- Profiles (handle_new_user trigger may have already created them)
INSERT INTO public.profiles (id, display_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Demo Host', 'host'),
  ('22222222-2222-2222-2222-222222222222', 'Demo Attendee', 'attendee')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role;

-- Host org
INSERT INTO public.hosts (id, profile_id, name, contact_email, bio)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'Demo Events Co.',
  'demo@example.com',
  'Sample host used for demo data.'
)
ON CONFLICT (id) DO NOTHING;

-- Upcoming event
INSERT INTO public.events (id, host_id, title, description, start_at, end_at, time_zone, venue_address, capacity, status, visibility)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'Lovable Community Meetup',
  'Join us for an evening of demos, drinks, and conversation.',
  now() + interval '14 days',
  now() + interval '14 days 2 hours',
  'UTC',
  '123 Demo Street, San Francisco, CA',
  100, 'published', 'public'
) ON CONFLICT (id) DO NOTHING;

-- Past event
INSERT INTO public.events (id, host_id, title, description, start_at, end_at, time_zone, venue_address, capacity, status, visibility)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  'Lovable Launch Party',
  'A look back at our launch celebration.',
  now() - interval '21 days',
  now() - interval '21 days' + interval '3 hours',
  'UTC',
  '500 Demo Ave, San Francisco, CA',
  80, 'published', 'public'
) ON CONFLICT (id) DO NOTHING;

-- RSVP + ticket on upcoming event
INSERT INTO public.rsvps (id, event_id, user_id, status)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '44444444-4444-4444-4444-444444444444',
  '22222222-2222-2222-2222-222222222222',
  'confirmed'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tickets (rsvp_id, code)
VALUES ('66666666-6666-6666-6666-666666666666', public.generate_ticket_code())
ON CONFLICT (rsvp_id) DO NOTHING;
