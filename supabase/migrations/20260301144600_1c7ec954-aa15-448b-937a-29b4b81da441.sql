
-- Add social links to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pinterest text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spotify text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS snapchat text DEFAULT '';

-- Add spotify playlist to groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS spotify_playlist_url text DEFAULT '';

-- Direct messages between friends
CREATE TABLE public.direct_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  friendship_id uuid NOT NULL REFERENCES public.friendships(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own DMs" ON public.direct_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM friendships f WHERE f.id = direct_messages.friendship_id
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Users can send DMs" ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM friendships f WHERE f.id = direct_messages.friendship_id
    AND f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Users can delete own DMs" ON public.direct_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- Direct todos between friends
CREATE TABLE public.direct_todos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  friendship_id uuid NOT NULL REFERENCES public.friendships(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  completed_by uuid[] DEFAULT '{}',
  due_date date,
  recurrence text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own direct todos" ON public.direct_todos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM friendships f WHERE f.id = direct_todos.friendship_id
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Users can create direct todos" ON public.direct_todos FOR INSERT
  WITH CHECK (auth.uid() = created_by AND EXISTS (
    SELECT 1 FROM friendships f WHERE f.id = direct_todos.friendship_id
    AND f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Users can update direct todos" ON public.direct_todos FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM friendships f WHERE f.id = direct_todos.friendship_id
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Creator can delete direct todos" ON public.direct_todos FOR DELETE
  USING (auth.uid() = created_by);

-- Direct challenges between friends
CREATE TABLE public.direct_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  friendship_id uuid NOT NULL REFERENCES public.friendships(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  challenge_type text NOT NULL,
  score_creator bigint DEFAULT 0,
  score_friend bigint DEFAULT 0,
  best_time_creator bigint,
  best_time_friend bigint,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.direct_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own direct challenges" ON public.direct_challenges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM friendships f WHERE f.id = direct_challenges.friendship_id
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Users can create direct challenges" ON public.direct_challenges FOR INSERT
  WITH CHECK (auth.uid() = created_by AND EXISTS (
    SELECT 1 FROM friendships f WHERE f.id = direct_challenges.friendship_id
    AND f.status = 'accepted'
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Users can update direct challenges" ON public.direct_challenges FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM friendships f WHERE f.id = direct_challenges.friendship_id
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  ));
CREATE POLICY "Creator can delete direct challenges" ON public.direct_challenges FOR DELETE
  USING (auth.uid() = created_by);

-- Group lists
CREATE TABLE public.group_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.group_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view lists" ON public.group_lists FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_lists.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Members can create lists" ON public.group_lists FOR INSERT
  WITH CHECK (auth.uid() = created_by AND EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_lists.group_id AND group_members.user_id = auth.uid()));
CREATE POLICY "Creator can delete lists" ON public.group_lists FOR DELETE
  USING (auth.uid() = created_by);
CREATE POLICY "Creator can update lists" ON public.group_lists FOR UPDATE
  USING (auth.uid() = created_by);

-- Group list items
CREATE TABLE public.group_list_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid NOT NULL REFERENCES public.group_lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_by uuid,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.group_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view list items" ON public.group_list_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_lists gl JOIN group_members gm ON gm.group_id = gl.group_id
    WHERE gl.id = group_list_items.list_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Members can create list items" ON public.group_list_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM group_lists gl JOIN group_members gm ON gm.group_id = gl.group_id
    WHERE gl.id = group_list_items.list_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Members can update list items" ON public.group_list_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM group_lists gl JOIN group_members gm ON gm.group_id = gl.group_id
    WHERE gl.id = group_list_items.list_id AND gm.user_id = auth.uid()
  ));
CREATE POLICY "Members can delete list items" ON public.group_list_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM group_lists gl JOIN group_members gm ON gm.group_id = gl.group_id
    WHERE gl.id = group_list_items.list_id AND gm.user_id = auth.uid()
  ));

-- Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
