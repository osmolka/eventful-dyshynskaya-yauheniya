DO $$
DECLARE
  host_a uuid := 'a1111111-0000-0000-0000-000000000001';
  host_b uuid := 'a1111111-0000-0000-0000-000000000002';
  host_c uuid := 'a1111111-0000-0000-0000-000000000003';
  prof_a uuid := 'b2222222-0000-0000-0000-000000000001';
  prof_b uuid := 'b2222222-0000-0000-0000-000000000002';
  prof_c uuid := 'b2222222-0000-0000-0000-000000000003';
  att1 uuid := 'c3333333-0000-0000-0000-000000000001';
  att2 uuid := 'c3333333-0000-0000-0000-000000000002';
  att3 uuid := 'c3333333-0000-0000-0000-000000000003';
  att4 uuid := 'c3333333-0000-0000-0000-000000000004';
  att5 uuid := 'c3333333-0000-0000-0000-000000000005';
  att6 uuid := 'c3333333-0000-0000-0000-000000000006';
  att7 uuid := 'c3333333-0000-0000-0000-000000000007';
  att8 uuid := 'c3333333-0000-0000-0000-000000000008';
  uid uuid;
  ev_up1 uuid := 'd4444444-0000-0000-0000-000000000001';
  ev_up2 uuid := 'd4444444-0000-0000-0000-000000000002';
  ev_up3 uuid := 'd4444444-0000-0000-0000-000000000003';
  ev_up4 uuid := 'd4444444-0000-0000-0000-000000000004';
  ev_up5 uuid := 'd4444444-0000-0000-0000-000000000005';
  ev_past1 uuid := 'd4444444-0000-0000-0000-000000000011';
  ev_past2 uuid := 'd4444444-0000-0000-0000-000000000012';
  ev_past3 uuid := 'd4444444-0000-0000-0000-000000000013';
  rsvp_id uuid;
BEGIN
  FOR uid IN SELECT unnest(ARRAY[prof_a, prof_b, prof_c, att1, att2, att3, att4, att5, att6, att7, att8]) LOOP
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
    ) VALUES (
      uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'demo+' || replace(uid::text, '-', '') || '@example.com',
      crypt('Password123!', gen_salt('bf')),
      now(), now(), now(),
      '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb, false, false, false
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;

  INSERT INTO profiles (id, display_name, role) VALUES
    (prof_a, 'Aurora Collective', 'host'),
    (prof_b, 'Bay Area Builders', 'host'),
    (prof_c, 'City Culture Club', 'host'),
    (att1, 'Alice Nguyen', 'attendee'),
    (att2, 'Ben Carter', 'attendee'),
    (att3, 'Chika Adeyemi', 'attendee'),
    (att4, 'Diego Ramos', 'attendee'),
    (att5, 'Elena Petrova', 'attendee'),
    (att6, 'Farah Hassan', 'attendee'),
    (att7, 'Gustav Lindberg', 'attendee'),
    (att8, 'Hana Tanaka', 'attendee')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO hosts (id, profile_id, name, bio, contact_email) VALUES
    (host_a, prof_a, 'Aurora Collective', 'Curating creative gatherings for designers and makers.', 'hello@aurora.example'),
    (host_b, prof_b, 'Bay Area Builders', 'Hands-on tech meetups for builders shipping in public.', 'team@babuilders.example'),
    (host_c, prof_c, 'City Culture Club', 'Music, food, and culture nights across the city.', 'contact@cityculture.example')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO events (id, host_id, title, description, start_at, end_at, time_zone, venue_address, online_link, capacity, status, visibility, cover_image_url) VALUES
    (ev_up1, host_a, 'Designers Night: Type & Color',
      'An evening with practicing designers sharing recent work, with drinks and lightning talks.',
      now() + interval '7 days', now() + interval '7 days 3 hours', 'America/Los_Angeles',
      'Aurora Loft, 200 Mission St, San Francisco', NULL, 40, 'published', 'public',
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200'),
    (ev_up2, host_b, 'Ship It Friday: Demo Day',
      'Five builders demoing what they shipped this week. Five minutes each, then Q&A.',
      now() + interval '14 days', now() + interval '14 days 2 hours', 'America/Los_Angeles',
      NULL, 'https://meet.example.com/ship-it', 100, 'published', 'public',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200'),
    (ev_up3, host_c, 'Sunset Jazz on the Pier',
      'Open-air jazz set as the sun goes down. Food trucks on site.',
      now() + interval '21 days', now() + interval '21 days 4 hours', 'America/New_York',
      'Pier 17, New York', NULL, 5, 'published', 'public',
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200'),
    (ev_up4, host_b, 'Backend Office Hours (members only)',
      'Bring your gnarliest backend question. Senior engineers will help you debug live.',
      now() + interval '10 days', now() + interval '10 days 90 minutes', 'America/Los_Angeles',
      NULL, 'https://meet.example.com/backend-oh', 30, 'published', 'unlisted',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200'),
    (ev_up5, host_a, 'Print Workshop: Risograph Basics',
      'A hands-on intro to risograph printing. Materials provided. Limited seats.',
      now() + interval '28 days', now() + interval '28 days 4 hours', 'America/Los_Angeles',
      'Aurora Studio, 1100 Folsom St, San Francisco', NULL, 12, 'published', 'unlisted',
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO events (id, host_id, title, description, start_at, end_at, time_zone, venue_address, online_link, capacity, status, visibility, cover_image_url) VALUES
    (ev_past1, host_a, 'Spring Mixer 2026',
      'Our annual spring gathering — drinks, music, and good company.',
      now() - interval '21 days', now() - interval '21 days' + interval '4 hours', 'America/Los_Angeles',
      'Aurora Loft, 200 Mission St, San Francisco', NULL, 80, 'published', 'public',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200'),
    (ev_past2, host_b, 'AI Hack Night',
      'Three hours of building with the latest models. Pizza on the house.',
      now() - interval '40 days', now() - interval '40 days' + interval '3 hours', 'America/Los_Angeles',
      'GitHub HQ, San Francisco', NULL, 60, 'published', 'public',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200'),
    (ev_past3, host_c, 'Late Night Film Club',
      'Cult classics on the rooftop. BYO blanket.',
      now() - interval '60 days', now() - interval '60 days' + interval '3 hours', 'America/New_York',
      'Brooklyn Rooftop, NY', NULL, 50, 'published', 'unlisted',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200')
  ON CONFLICT (id) DO NOTHING;

  -- ev_up1: 4 confirmed
  FOR uid IN SELECT unnest(ARRAY[att1, att2, att3, att4]) LOOP
    INSERT INTO rsvps (event_id, user_id, status) VALUES (ev_up1, uid, 'confirmed')
      ON CONFLICT DO NOTHING RETURNING id INTO rsvp_id;
    IF rsvp_id IS NOT NULL THEN
      INSERT INTO tickets (rsvp_id, code) VALUES (rsvp_id, generate_ticket_code()) ON CONFLICT DO NOTHING;
    END IF;
    rsvp_id := NULL;
  END LOOP;

  -- ev_up3 (cap 5): 5 confirmed + 2 waitlisted
  FOR uid IN SELECT unnest(ARRAY[att1, att2, att3, att4, att5]) LOOP
    INSERT INTO rsvps (event_id, user_id, status) VALUES (ev_up3, uid, 'confirmed')
      ON CONFLICT DO NOTHING RETURNING id INTO rsvp_id;
    IF rsvp_id IS NOT NULL THEN
      INSERT INTO tickets (rsvp_id, code) VALUES (rsvp_id, generate_ticket_code()) ON CONFLICT DO NOTHING;
    END IF;
    rsvp_id := NULL;
  END LOOP;
  FOR uid IN SELECT unnest(ARRAY[att6, att7]) LOOP
    INSERT INTO rsvps (event_id, user_id, status) VALUES (ev_up3, uid, 'waitlisted')
      ON CONFLICT DO NOTHING;
  END LOOP;

  -- ev_up2: 6 confirmed
  FOR uid IN SELECT unnest(ARRAY[att1, att2, att3, att5, att6, att8]) LOOP
    INSERT INTO rsvps (event_id, user_id, status) VALUES (ev_up2, uid, 'confirmed')
      ON CONFLICT DO NOTHING RETURNING id INTO rsvp_id;
    IF rsvp_id IS NOT NULL THEN
      INSERT INTO tickets (rsvp_id, code) VALUES (rsvp_id, generate_ticket_code()) ON CONFLICT DO NOTHING;
    END IF;
    rsvp_id := NULL;
  END LOOP;

  -- ev_past1: 6 confirmed
  FOR uid IN SELECT unnest(ARRAY[att1, att2, att3, att4, att5, att6]) LOOP
    INSERT INTO rsvps (event_id, user_id, status) VALUES (ev_past1, uid, 'confirmed')
      ON CONFLICT DO NOTHING RETURNING id INTO rsvp_id;
    IF rsvp_id IS NOT NULL THEN
      INSERT INTO tickets (rsvp_id, code) VALUES (rsvp_id, generate_ticket_code()) ON CONFLICT DO NOTHING;
    END IF;
    rsvp_id := NULL;
  END LOOP;
  UPDATE tickets SET checked_in_at = now() - interval '21 days' + interval '2 hours',
                     checked_in_by = prof_a
   WHERE id IN (
     SELECT t2.id FROM tickets t2
       JOIN rsvps r ON r.id = t2.rsvp_id
      WHERE r.event_id = ev_past1
      ORDER BY t2.created_at ASC
      LIMIT 4
   );

  -- ev_past2: 5 confirmed
  FOR uid IN SELECT unnest(ARRAY[att2, att3, att5, att7, att8]) LOOP
    INSERT INTO rsvps (event_id, user_id, status) VALUES (ev_past2, uid, 'confirmed')
      ON CONFLICT DO NOTHING RETURNING id INTO rsvp_id;
    IF rsvp_id IS NOT NULL THEN
      INSERT INTO tickets (rsvp_id, code) VALUES (rsvp_id, generate_ticket_code()) ON CONFLICT DO NOTHING;
    END IF;
    rsvp_id := NULL;
  END LOOP;
  UPDATE tickets SET checked_in_at = now() - interval '40 days' + interval '90 minutes',
                     checked_in_by = prof_b
   WHERE id IN (
     SELECT t2.id FROM tickets t2
       JOIN rsvps r ON r.id = t2.rsvp_id
      WHERE r.event_id = ev_past2
      ORDER BY t2.created_at ASC
      LIMIT 3
   );
END $$;