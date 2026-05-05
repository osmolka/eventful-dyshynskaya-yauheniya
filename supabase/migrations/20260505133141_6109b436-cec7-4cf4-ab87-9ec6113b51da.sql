CREATE OR REPLACE FUNCTION public.get_event_counts(_event_id uuid)
RETURNS TABLE(confirmed_count int, waitlist_count int, checked_in_count int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN r.status = 'confirmed' THEN 1 ELSE 0 END), 0)::int AS confirmed_count,
    COALESCE(SUM(CASE WHEN r.status = 'waitlisted' THEN 1 ELSE 0 END), 0)::int AS waitlist_count,
    COALESCE(SUM(CASE WHEN t.checked_in_at IS NOT NULL THEN 1 ELSE 0 END), 0)::int AS checked_in_count
  FROM public.rsvps r
  LEFT JOIN public.tickets t ON t.rsvp_id = r.id
  WHERE r.event_id = _event_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = _event_id AND e.status = 'published' AND e.hidden = false
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_event_counts(uuid) TO anon, authenticated;