
CREATE POLICY "Users can delete their own rsvp"
  ON public.rsvps FOR DELETE
  USING (auth.uid() = user_id);
