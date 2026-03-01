
-- Post expiration: 48h default, extended by likes/respect
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '48 hours');

-- Challenge improvements: count reset interval, endurance acceptance tracking
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS reset_interval text DEFAULT NULL;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS accepted_by uuid[] DEFAULT '{}'::uuid[];
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS declined_by uuid[] DEFAULT '{}'::uuid[];
