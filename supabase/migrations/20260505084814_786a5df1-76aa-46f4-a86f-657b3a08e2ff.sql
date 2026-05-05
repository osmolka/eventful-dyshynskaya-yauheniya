CREATE TABLE public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

-- Validation: event must have ended, user must have a confirmed RSVP
CREATE OR REPLACE FUNCTION public.validate_event_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev_end timestamptz;
  has_confirmed boolean;
BEGIN
  SELECT end_at INTO ev_end FROM public.events WHERE id = NEW.event_id;
  IF ev_end IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  IF ev_end > now() THEN
    RAISE EXCEPTION 'Feedback is only available after the event ends';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.rsvps
    WHERE event_id = NEW.event_id AND user_id = NEW.user_id AND status = 'confirmed'
  ) INTO has_confirmed;
  IF NOT has_confirmed THEN
    RAISE EXCEPTION 'Only confirmed attendees can submit feedback';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER event_feedback_validate
BEFORE INSERT OR UPDATE ON public.event_feedback
FOR EACH ROW EXECUTE FUNCTION public.validate_event_feedback();

CREATE TRIGGER event_feedback_updated_at
BEFORE UPDATE ON public.event_feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
CREATE POLICY "Users can view their own feedback"
ON public.event_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Hosts can view feedback for their events"
ON public.event_feedback FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.events e
  WHERE e.id = event_feedback.event_id AND public.is_host_role(e.host_id)
));

CREATE POLICY "Confirmed attendees can submit feedback"
ON public.event_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
ON public.event_feedback FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback"
ON public.event_feedback FOR DELETE
USING (auth.uid() = user_id);