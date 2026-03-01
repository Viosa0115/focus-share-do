
-- Add has_flashbacks to groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS has_flashbacks boolean NOT NULL DEFAULT false;

-- Add image support to direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS is_snap boolean NOT NULL DEFAULT false;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS viewed_by uuid[] DEFAULT '{}'::uuid[];
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS saved_by uuid[] DEFAULT '{}'::uuid[];

-- Add image support to group_messages
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS is_snap boolean NOT NULL DEFAULT false;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS viewed_by uuid[] DEFAULT '{}'::uuid[];
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS saved_by uuid[] DEFAULT '{}'::uuid[];

-- Create flashbacks table
CREATE TABLE public.group_flashbacks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  unlock_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_flashbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view flashbacks" ON public.group_flashbacks
  FOR SELECT USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can create flashbacks" ON public.group_flashbacks
  FOR INSERT WITH CHECK (auth.uid() = created_by AND public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Creator can update flashbacks" ON public.group_flashbacks
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete flashbacks" ON public.group_flashbacks
  FOR DELETE USING (auth.uid() = created_by);

-- Create flashback media table
CREATE TABLE public.flashback_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flashback_id uuid NOT NULL REFERENCES public.group_flashbacks(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.flashback_media ENABLE ROW LEVEL SECURITY;

-- Members can view media only if flashback is unlocked
CREATE POLICY "Members can view flashback media" ON public.flashback_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_flashbacks gf
      WHERE gf.id = flashback_media.flashback_id
      AND public.is_group_member(auth.uid(), gf.group_id)
    )
  );

CREATE POLICY "Members can upload flashback media" ON public.flashback_media
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.group_flashbacks gf
      WHERE gf.id = flashback_media.flashback_id
      AND public.is_group_member(auth.uid(), gf.group_id)
    )
  );

CREATE POLICY "Uploader can delete own media" ON public.flashback_media
  FOR DELETE USING (auth.uid() = uploaded_by);

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true) ON CONFLICT DO NOTHING;

-- Storage policies for chat-images bucket
CREATE POLICY "Authenticated users can upload chat images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Anyone can view chat images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-images');

CREATE POLICY "Users can delete own chat images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create storage bucket for flashback media
INSERT INTO storage.buckets (id, name, public) VALUES ('flashback-media', 'flashback-media', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users can upload flashback media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'flashback-media');

CREATE POLICY "Anyone can view flashback media" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'flashback-media');

CREATE POLICY "Users can delete own flashback media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'flashback-media' AND (storage.foldername(name))[1] = auth.uid()::text);
