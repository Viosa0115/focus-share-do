
-- Table: todo_completions (history of completed todos)
CREATE TABLE IF NOT EXISTS public.todo_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  todo_id uuid REFERENCES public.todos(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  recurrence text,
  label_id uuid REFERENCES public.todo_labels(id) ON DELETE SET NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.todo_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own completions" ON public.todo_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.todo_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.todo_completions FOR DELETE USING (auth.uid() = user_id);

-- Table: todo_streaks (streak tracking per todo per user)
CREATE TABLE IF NOT EXISTS public.todo_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  todo_id uuid REFERENCES public.todos(id) ON DELETE CASCADE,
  todo_title text NOT NULL,
  recurrence text NOT NULL DEFAULT 'daily',
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_completed_period text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, todo_id)
);
ALTER TABLE public.todo_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own streaks" ON public.todo_streaks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add label_id and end_date/end_time to personal_challenges
ALTER TABLE public.personal_challenges 
  ADD COLUMN IF NOT EXISTS label_id uuid REFERENCES public.todo_labels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS end_time time without time zone;

-- Table: personal_challenge_times (top 10 times per challenge)
CREATE TABLE IF NOT EXISTS public.personal_challenge_times (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid NOT NULL REFERENCES public.personal_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  time_ms bigint NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.personal_challenge_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own times" ON public.personal_challenge_times FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add longest_time_ms to personal_challenges for endurance
ALTER TABLE public.personal_challenges
  ADD COLUMN IF NOT EXISTS longest_time_ms bigint;
