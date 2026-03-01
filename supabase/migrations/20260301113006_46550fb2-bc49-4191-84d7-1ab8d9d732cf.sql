
-- Todo labels for personal todos
CREATE TABLE public.todo_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.todo_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own labels" ON public.todo_labels FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add label_id to todos
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS label_id uuid REFERENCES public.todo_labels(id) ON DELETE SET NULL;

-- Personal challenges (no leaderboard)
CREATE TABLE public.personal_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  challenge_type text NOT NULL, -- count, time, endurance
  score bigint NOT NULL DEFAULT 0,
  best_time_ms bigint,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  given_up boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own challenges" ON public.personal_challenges FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Post likes
CREATE TABLE public.post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view likes" ON public.post_likes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can like" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Post comments
CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view comments" ON public.post_comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can comment" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

-- Respect points (1x daily per user)
CREATE TABLE public.respect_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  given_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_user_id, given_at)
);
ALTER TABLE public.respect_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view respect" ON public.respect_points FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can give respect" ON public.respect_points FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Update groups policy to allow admins to update (not just owner)
DROP POLICY IF EXISTS "Owner can update groups" ON public.groups;
CREATE POLICY "Owner or admin can update groups" ON public.groups FOR UPDATE 
  USING ((owner_id = auth.uid()) OR is_group_admin(auth.uid(), id));

-- Allow admins to delete groups
DROP POLICY IF EXISTS "Owner can delete groups" ON public.groups;
CREATE POLICY "Owner or admin can delete groups" ON public.groups FOR DELETE 
  USING ((owner_id = auth.uid()) OR is_group_admin(auth.uid(), id));
