
-- Add aura column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS aura integer NOT NULL DEFAULT 0;

-- Create saved_posts table
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can save posts" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own saved" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can unsave" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

-- Add UPDATE policy on posts for expires_at
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);

-- Add UPDATE policy on profiles for aura (already has update policy for own profile)
