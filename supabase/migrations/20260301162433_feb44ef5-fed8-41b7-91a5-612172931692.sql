
ALTER TABLE public.group_todos ADD COLUMN IF NOT EXISTS label_name text DEFAULT NULL;
ALTER TABLE public.group_todos ADD COLUMN IF NOT EXISTS label_color text DEFAULT NULL;
ALTER TABLE public.group_todos ADD COLUMN IF NOT EXISTS assigned_to uuid[] DEFAULT '{}'::uuid[];
