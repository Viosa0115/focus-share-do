
-- Add due_time, label_name, label_color to direct_todos
ALTER TABLE public.direct_todos ADD COLUMN IF NOT EXISTS due_time TIME WITHOUT TIME ZONE DEFAULT NULL;
ALTER TABLE public.direct_todos ADD COLUMN IF NOT EXISTS label_name TEXT DEFAULT NULL;
ALTER TABLE public.direct_todos ADD COLUMN IF NOT EXISTS label_color TEXT DEFAULT NULL;
ALTER TABLE public.direct_todos ADD COLUMN IF NOT EXISTS add_to_calendar BOOLEAN NOT NULL DEFAULT false;

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block" ON public.blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- Add read_receipts setting to notification_preferences
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS read_receipts BOOLEAN NOT NULL DEFAULT true;
