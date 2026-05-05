CREATE OR REPLACE FUNCTION public.export_event_rsvps(_event_id uuid)
RETURNS TABLE(name text, email text, rsvp_status text, checked_in_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(p.display_name, '')::text AS name,
    COALESCE(u.email, '')::text AS email,
    r.status::text AS rsvp_status,
    t.checked_in_at
  FROM public.rsvps r
  JOIN public.events e ON e.id = r.event_id
  LEFT JOIN public.profiles p ON p.id = r.user_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.tickets t ON t.rsvp_id = r.id
  WHERE r.event_id = _event_id
    AND public.is_host_role(e.host_id)
  ORDER BY r.created_at ASC;
$$;