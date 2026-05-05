-- Status enum
CREATE TYPE public.photo_status AS ENUM ('pending', 'approved', 'rejected');

-- Photos table
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL,
  storage_path text NOT NULL,
  caption text,
  status public.photo_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_photos_event ON public.event_photos(event_id, status);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

-- View: approved photos for published events visible to everyone
CREATE POLICY "Approved photos are public"
  ON public.event_photos FOR SELECT
  USING (
    status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_photos.event_id AND e.status = 'published'
    )
  );

-- Uploaders see their own photos
CREATE POLICY "Uploaders view own photos"
  ON public.event_photos FOR SELECT
  USING (auth.uid() = uploader_id);

-- Hosts see all photos for their events
CREATE POLICY "Hosts view event photos"
  ON public.event_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_photos.event_id AND public.is_host_role(e.host_id)
  ));

-- Confirmed attendees can upload (insert) photos for an event
CREATE POLICY "Confirmed attendees can upload photos"
  ON public.event_photos FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.rsvps r
      WHERE r.event_id = event_photos.event_id
        AND r.user_id = auth.uid()
        AND r.status = 'confirmed'
    )
  );

-- Hosts can update (moderate) photos for their events
CREATE POLICY "Hosts can moderate photos"
  ON public.event_photos FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_photos.event_id AND public.is_host_role(e.host_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_photos.event_id AND public.is_host_role(e.host_id)
  ));

-- Uploaders can delete own photos; hosts can delete any
CREATE POLICY "Uploaders delete own photos"
  ON public.event_photos FOR DELETE
  USING (auth.uid() = uploader_id);

CREATE POLICY "Hosts delete event photos"
  ON public.event_photos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_photos.event_id AND public.is_host_role(e.host_id)
  ));

-- updated_at trigger
CREATE TRIGGER update_event_photos_updated_at
  BEFORE UPDATE ON public.event_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Event photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

CREATE POLICY "Confirmed attendees can upload event photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-photos'
    AND auth.uid()::text = (storage.foldername(name))[2]
    AND EXISTS (
      SELECT 1 FROM public.rsvps r
      WHERE r.event_id::text = (storage.foldername(name))[1]
        AND r.user_id = auth.uid()
        AND r.status = 'confirmed'
    )
  );

CREATE POLICY "Uploaders can delete own event photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-photos'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

CREATE POLICY "Hosts can delete event photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-photos'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id::text = (storage.foldername(name))[1]
        AND public.is_host_role(e.host_id)
    )
  );
