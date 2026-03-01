
-- Chat streaks table for friend messaging streaks
CREATE TABLE public.chat_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id uuid NOT NULL REFERENCES public.friendships(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_both_chatted_date date,
  user1_last_msg_date date,
  user2_last_msg_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(friendship_id)
);

ALTER TABLE public.chat_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat streaks" ON public.chat_streaks
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM friendships f 
  WHERE f.id = chat_streaks.friendship_id 
  AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
));

CREATE POLICY "Users can upsert own chat streaks" ON public.chat_streaks
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM friendships f 
  WHERE f.id = chat_streaks.friendship_id 
  AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
));

CREATE POLICY "Users can update own chat streaks" ON public.chat_streaks
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM friendships f 
  WHERE f.id = chat_streaks.friendship_id 
  AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
));

-- Self-destructing messages setting columns
ALTER TABLE public.friendships ADD COLUMN IF NOT EXISTS auto_delete_messages boolean NOT NULL DEFAULT false;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS auto_delete_messages boolean NOT NULL DEFAULT false;

-- Add UPDATE policy for direct_messages (needed for viewed_by/saved_by)
CREATE POLICY "Users can update DMs in their friendship" ON public.direct_messages
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM friendships f 
  WHERE f.id = direct_messages.friendship_id 
  AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
));

-- Add UPDATE policy for group_messages (needed for viewed_by/saved_by)
CREATE POLICY "Members can update group messages" ON public.group_messages
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM group_members 
  WHERE group_members.group_id = group_messages.group_id 
  AND group_members.user_id = auth.uid()
));

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  push_enabled boolean NOT NULL DEFAULT false,
  events boolean NOT NULL DEFAULT true,
  likes boolean NOT NULL DEFAULT true,
  comments boolean NOT NULL DEFAULT true,
  todos boolean NOT NULL DEFAULT true,
  chat_messages boolean NOT NULL DEFAULT true,
  challenges boolean NOT NULL DEFAULT true,
  flashbacks boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own preferences" ON public.notification_preferences
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
