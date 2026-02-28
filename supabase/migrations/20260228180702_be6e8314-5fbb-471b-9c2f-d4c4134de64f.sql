
-- 1. Join requests table
CREATE TABLE public.group_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create join requests" ON public.group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and owners can view requests" ON public.group_join_requests
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM groups WHERE id = group_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM group_members WHERE group_id = group_join_requests.group_id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update requests" ON public.group_join_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM groups WHERE id = group_id AND owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM group_members WHERE group_id = group_join_requests.group_id AND user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can delete own requests" ON public.group_join_requests
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Add permission columns to group_members
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS can_chat boolean NOT NULL DEFAULT true;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS can_challenges boolean NOT NULL DEFAULT true;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS can_todos boolean NOT NULL DEFAULT true;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS can_events boolean NOT NULL DEFAULT true;

-- 3. Admin helper function
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin'
  )
$$;

-- 4. Allow admins to update group_members (for roles/permissions)
CREATE POLICY "Admins can update members" ON public.group_members
  FOR UPDATE USING (public.is_group_admin(auth.uid(), group_id));

-- 5. Avatar storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Enable realtime for challenges (for live leaderboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_join_requests;
