
-- Fix groups RLS: drop all SELECT policies and replace with a single permissive one
DROP POLICY IF EXISTS "Anyone can lookup group by join code" ON public.groups;
DROP POLICY IF EXISTS "Members can view groups" ON public.groups;
DROP POLICY IF EXISTS "Owner can view own groups" ON public.groups;

CREATE POLICY "Authenticated users can view groups" ON public.groups
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Add max_members column with default 15
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 15;

-- Function to check member limit before joining
CREATE OR REPLACE FUNCTION public.check_group_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  max_limit integer;
BEGIN
  SELECT COUNT(*) INTO current_count FROM group_members WHERE group_id = NEW.group_id;
  SELECT max_members INTO max_limit FROM groups WHERE id = NEW.group_id;
  IF current_count >= max_limit THEN
    RAISE EXCEPTION 'Gruppe ist voll (max. % Mitglieder)', max_limit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_group_member_limit ON public.group_members;
CREATE TRIGGER enforce_group_member_limit
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.check_group_member_limit();
