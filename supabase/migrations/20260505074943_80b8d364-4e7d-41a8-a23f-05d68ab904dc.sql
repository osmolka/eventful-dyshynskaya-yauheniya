
DROP POLICY "Hosts can view their own events" ON public.events;
DROP POLICY "Hosts can create their own events" ON public.events;
DROP POLICY "Hosts can update their own events" ON public.events;
DROP POLICY "Hosts can delete their own events" ON public.events;

CREATE POLICY "Host members can view events"
  ON public.events FOR SELECT
  USING (public.is_host_role(host_id));

CREATE POLICY "Host members can create events"
  ON public.events FOR INSERT
  WITH CHECK (public.is_host_role(host_id));

CREATE POLICY "Host members can update events"
  ON public.events FOR UPDATE
  USING (public.is_host_role(host_id))
  WITH CHECK (public.is_host_role(host_id));

CREATE POLICY "Host members can delete events"
  ON public.events FOR DELETE
  USING (public.is_host_role(host_id));
