
-- Track check-in
ALTER TABLE public.tickets
  ADD COLUMN checked_in_at timestamptz,
  ADD COLUMN checked_in_by uuid;

-- Checkers assigned to a host
CREATE TABLE public.host_checkers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (host_id, profile_id)
);

ALTER TABLE public.host_checkers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host owners can manage checkers"
  ON public.host_checkers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.hosts h
    WHERE h.id = host_checkers.host_id AND h.profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.hosts h
    WHERE h.id = host_checkers.host_id AND h.profile_id = auth.uid()
  ));

CREATE POLICY "Checkers can view their own assignment"
  ON public.host_checkers FOR SELECT
  USING (auth.uid() = profile_id);

-- Helper: is current user a host owner or checker for this event's host?
CREATE OR REPLACE FUNCTION public.can_check_in_event(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.hosts h ON h.id = e.host_id
    WHERE e.id = _event_id
      AND (
        h.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.host_checkers c
          WHERE c.host_id = h.id AND c.profile_id = auth.uid()
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_check_in_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_check_in_event(uuid) TO authenticated;

-- Allow checkers to also see the RSVPs / tickets they need to check in
CREATE POLICY "Checkers can view rsvps for their events"
  ON public.rsvps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.host_checkers c ON c.host_id = e.host_id
    WHERE e.id = rsvps.event_id AND c.profile_id = auth.uid()
  ));

CREATE POLICY "Checkers can view tickets for their events"
  ON public.tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.rsvps r
    JOIN public.events e ON e.id = r.event_id
    JOIN public.host_checkers c ON c.host_id = e.host_id
    WHERE r.id = tickets.rsvp_id AND c.profile_id = auth.uid()
  ));

-- Allow hosts and checkers to update checked_in_* fields on tickets for their events
CREATE POLICY "Hosts and checkers can check in tickets"
  ON public.tickets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.rsvps r
    WHERE r.id = tickets.rsvp_id
      AND public.can_check_in_event(r.event_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.rsvps r
    WHERE r.id = tickets.rsvp_id
      AND public.can_check_in_event(r.event_id)
  ));
