-- Hidden flags
ALTER TABLE public.events ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.event_photos ADD COLUMN hidden boolean NOT NULL DEFAULT false;

-- Tighten public visibility
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
CREATE POLICY "Published events are viewable by everyone"
  ON public.events FOR SELECT
  USING (status = 'published' AND hidden = false);

DROP POLICY IF EXISTS "Approved photos are public" ON public.event_photos;
CREATE POLICY "Approved photos are public"
  ON public.event_photos FOR SELECT
  USING (
    status = 'approved'
    AND hidden = false
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_photos.event_id
        AND e.status = 'published'
        AND e.hidden = false
    )
  );

-- Report target type
CREATE TYPE public.report_target AS ENUM ('event', 'photo');

CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type public.report_target NOT NULL,
  target_id uuid NOT NULL,
  reason text NOT NULL,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_reports_target ON public.content_reports(target_type, target_id);
CREATE INDEX idx_content_reports_open ON public.content_reports(resolved_at) WHERE resolved_at IS NULL;

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a host of the report's target?
CREATE OR REPLACE FUNCTION public.is_report_host(_target_type public.report_target, _target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _target_type
    WHEN 'event' THEN EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = _target_id AND public.is_host_role(e.host_id)
    )
    WHEN 'photo' THEN EXISTS (
      SELECT 1 FROM public.event_photos p
      JOIN public.events e ON e.id = p.event_id
      WHERE p.id = _target_id AND public.is_host_role(e.host_id)
    )
  END;
$$;

-- Any signed-in user can submit a report
CREATE POLICY "Users can submit reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Reporters see their own reports
CREATE POLICY "Reporters view own reports"
  ON public.content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Hosts see reports targeting their content
CREATE POLICY "Hosts view reports for own content"
  ON public.content_reports FOR SELECT
  USING (public.is_report_host(target_type, target_id));

-- Hosts can resolve reports targeting their content
CREATE POLICY "Hosts can resolve reports"
  ON public.content_reports FOR UPDATE
  USING (public.is_report_host(target_type, target_id))
  WITH CHECK (public.is_report_host(target_type, target_id));
