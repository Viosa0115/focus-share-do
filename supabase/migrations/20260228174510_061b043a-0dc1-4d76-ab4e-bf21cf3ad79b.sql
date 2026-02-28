
-- Allow any authenticated user to look up a group by join_code (needed for joining)
CREATE POLICY "Anyone can lookup group by join code"
  ON public.groups FOR SELECT
  USING (auth.uid() IS NOT NULL);
