-- Fix avatar storage policies for group uploads
CREATE POLICY "Admins can upload group avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'groups'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins can update group avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'groups'
    AND auth.uid() IS NOT NULL
  );

-- Add comment replies table
CREATE TABLE IF NOT EXISTS public.post_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comment_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view replies" ON public.post_comment_replies
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can reply" ON public.post_comment_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON public.post_comment_replies
  FOR DELETE USING (auth.uid() = user_id);

-- Add todo invitations table
CREATE TABLE IF NOT EXISTS public.todo_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.todo_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invitations" ON public.todo_invitations
  FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
CREATE POLICY "Users can create invitations" ON public.todo_invitations
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update own invitations" ON public.todo_invitations
  FOR UPDATE USING (auth.uid() = to_user_id);

-- Add chat polls table
CREATE TABLE IF NOT EXISTS public.group_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  votes jsonb NOT NULL DEFAULT '{}',
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view polls" ON public.group_polls
  FOR SELECT USING (is_group_member(auth.uid(), group_id));
CREATE POLICY "Members can create polls" ON public.group_polls
  FOR INSERT WITH CHECK (auth.uid() = created_by AND is_group_member(auth.uid(), group_id));
CREATE POLICY "Members can vote" ON public.group_polls
  FOR UPDATE USING (is_group_member(auth.uid(), group_id));
CREATE POLICY "Creator can delete polls" ON public.group_polls
  FOR DELETE USING (auth.uid() = created_by);

-- Add pinned messages table
CREATE TABLE IF NOT EXISTS public.group_pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, message_id)
);

ALTER TABLE public.group_pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view pins" ON public.group_pinned_messages
  FOR SELECT USING (is_group_member(auth.uid(), group_id));
CREATE POLICY "Members can pin" ON public.group_pinned_messages
  FOR INSERT WITH CHECK (auth.uid() = pinned_by AND is_group_member(auth.uid(), group_id));
CREATE POLICY "Members can unpin" ON public.group_pinned_messages
  FOR DELETE USING (is_group_member(auth.uid(), group_id));

-- Add spotify_url to flashbacks
ALTER TABLE public.group_flashbacks ADD COLUMN IF NOT EXISTS spotify_url text DEFAULT '';

-- Enable realtime for polls
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_pinned_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todo_invitations;