
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TYPE public.rsvp_status AS ENUM ('confirmed', 'waitlisted');

CREATE TABLE public.rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status public.rsvp_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX idx_rsvps_event ON public.rsvps(event_id);
CREATE INDEX idx_rsvps_user ON public.rsvps(user_id);

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rsvps"
  ON public.rsvps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts can view rsvps for their events"
  ON public.rsvps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.hosts h ON h.id = e.host_id
    WHERE e.id = rsvps.event_id AND h.profile_id = auth.uid()
  ));

CREATE POLICY "Users can create their own rsvp for published events"
  ON public.rsvps FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = rsvps.event_id AND e.status = 'published'
    )
  );

CREATE OR REPLACE FUNCTION public.set_rsvp_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev_capacity int;
  confirmed_count int;
BEGIN
  SELECT capacity INTO ev_capacity FROM public.events WHERE id = NEW.event_id;
  SELECT COUNT(*) INTO confirmed_count
    FROM public.rsvps
    WHERE event_id = NEW.event_id AND status = 'confirmed';

  IF ev_capacity IS NULL OR ev_capacity = 0 OR confirmed_count < ev_capacity THEN
    NEW.status := 'confirmed';
  ELSE
    NEW.status := 'waitlisted';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER set_rsvp_status_before_insert
  BEFORE INSERT ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.set_rsvp_status();

CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
