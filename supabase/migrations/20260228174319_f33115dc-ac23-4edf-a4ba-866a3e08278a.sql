
-- 1. Add recurrence & due_time to todos
ALTER TABLE public.todos 
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS due_time time DEFAULT NULL;

-- 2. Add recurrence & due_date & due_time to group_todos  
ALTER TABLE public.group_todos
  ADD COLUMN IF NOT EXISTS due_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS due_time time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT NULL;

-- 3. Add privacy to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 4. Create posts table for todo completion feed
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  todo_id uuid REFERENCES public.todos(id) ON DELETE SET NULL,
  group_todo_id uuid REFERENCES public.group_todos(id) ON DELETE SET NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  image_url text DEFAULT NULL,
  tagged_user_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Public posts visible to all authenticated users (if author is public)
CREATE POLICY "Public posts are visible to all"
  ON public.posts FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- own posts always visible
      user_id = auth.uid()
      -- or author's profile is public
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = posts.user_id AND p.is_private = false
      )
      -- or viewer is a friend of the author
      OR EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND ((f.requester_id = auth.uid() AND f.addressee_id = posts.user_id)
            OR (f.addressee_id = auth.uid() AND f.requester_id = posts.user_id))
      )
    )
  );

CREATE POLICY "Users can create own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Post images are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Users can delete own post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
