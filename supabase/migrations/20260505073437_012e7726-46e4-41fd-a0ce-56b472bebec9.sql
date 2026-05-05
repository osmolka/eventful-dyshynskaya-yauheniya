
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id uuid NOT NULL UNIQUE REFERENCES public.rsvps(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_rsvp ON public.tickets(rsvp_id);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their own ticket"
  ON public.tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.rsvps r
    WHERE r.id = tickets.rsvp_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Hosts can view tickets for their events"
  ON public.tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.rsvps r
    JOIN public.events e ON e.id = r.event_id
    JOIN public.hosts h ON h.id = e.host_id
    WHERE r.id = tickets.rsvp_id AND h.profile_id = auth.uid()
  ));

-- Generate a unique alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i int;
  exists_already boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..12 LOOP
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.tickets WHERE code = result) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_ticket_code() FROM PUBLIC, anon, authenticated;

-- Issue ticket whenever an RSVP becomes confirmed
CREATE OR REPLACE FUNCTION public.issue_ticket_for_rsvp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    INSERT INTO public.tickets (rsvp_id, code)
    VALUES (NEW.id, public.generate_ticket_code())
    ON CONFLICT (rsvp_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_ticket_for_rsvp() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER issue_ticket_after_rsvp_insert
  AFTER INSERT ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.issue_ticket_for_rsvp();

CREATE TRIGGER issue_ticket_after_rsvp_update
  AFTER UPDATE OF status ON public.rsvps
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed')
  EXECUTE FUNCTION public.issue_ticket_for_rsvp();

ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
