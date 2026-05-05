
-- Promote waitlisted RSVPs to confirmed up to event capacity, FIFO.
CREATE OR REPLACE FUNCTION public.promote_waitlist(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev_capacity int;
  confirmed_count int;
  slots int;
BEGIN
  -- Per-event advisory lock to serialize promotions
  PERFORM pg_advisory_xact_lock(hashtextextended(_event_id::text, 0));

  SELECT capacity INTO ev_capacity FROM public.events WHERE id = _event_id;
  IF ev_capacity IS NULL OR ev_capacity = 0 THEN
    -- Unlimited capacity: promote everyone waitlisted
    UPDATE public.rsvps
       SET status = 'confirmed'
     WHERE event_id = _event_id AND status = 'waitlisted';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO confirmed_count
    FROM public.rsvps
    WHERE event_id = _event_id AND status = 'confirmed';

  slots := ev_capacity - confirmed_count;
  IF slots <= 0 THEN
    RETURN;
  END IF;

  UPDATE public.rsvps
     SET status = 'confirmed'
   WHERE id IN (
     SELECT id FROM public.rsvps
      WHERE event_id = _event_id AND status = 'waitlisted'
      ORDER BY created_at ASC, id ASC
      LIMIT slots
   );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.promote_waitlist(uuid) FROM PUBLIC, anon, authenticated;

-- Trigger after RSVP delete: if it was confirmed, fill the slot
CREATE OR REPLACE FUNCTION public.handle_rsvp_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'confirmed' THEN
    PERFORM public.promote_waitlist(OLD.event_id);
  END IF;
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_rsvp_delete() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER promote_after_rsvp_delete
  AFTER DELETE ON public.rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_rsvp_delete();

-- Trigger after event capacity change
CREATE OR REPLACE FUNCTION public.handle_event_capacity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.capacity IS DISTINCT FROM OLD.capacity THEN
    PERFORM public.promote_waitlist(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_event_capacity_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER promote_after_event_capacity_change
  AFTER UPDATE OF capacity ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_event_capacity_change();

-- Enable realtime so the promoted user sees their status update live
ALTER TABLE public.rsvps REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rsvps;
