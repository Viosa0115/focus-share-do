
-- ========================================
-- GROUP MESSAGES (Chat)
-- ========================================
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Members can view messages in their groups
CREATE POLICY "Members can view group messages"
  ON public.group_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_messages.group_id
    AND group_members.user_id = auth.uid()
  ));

-- Members can send messages
CREATE POLICY "Members can send messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_messages.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Users can delete own messages
CREATE POLICY "Users can delete own messages"
  ON public.group_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- ========================================
-- GROUP EVENTS
-- ========================================
CREATE TABLE public.group_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group events"
  ON public.group_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_events.group_id
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can create events"
  ON public.group_events FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_events.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update events"
  ON public.group_events FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete events"
  ON public.group_events FOR DELETE
  USING (auth.uid() = created_by);

-- ========================================
-- EVENT RSVPS
-- ========================================
CREATE TABLE public.event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_events ge
    JOIN public.group_members gm ON gm.group_id = ge.group_id
    WHERE ge.id = event_rsvps.event_id
    AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Users can RSVP"
  ON public.event_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSVP"
  ON public.event_rsvps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RSVP"
  ON public.event_rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- CHALLENGES
-- ========================================
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('count', 'time', 'endurance')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view challenges"
  ON public.challenges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = challenges.group_id
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can create challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = challenges.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update challenges"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creator can delete challenges"
  ON public.challenges FOR DELETE
  USING (auth.uid() = created_by);

-- ========================================
-- CHALLENGE PARTICIPANTS
-- ========================================
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score BIGINT NOT NULL DEFAULT 0,
  best_time_ms BIGINT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  given_up BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view participants"
  ON public.challenge_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.challenges c
    JOIN public.group_members gm ON gm.group_id = c.group_id
    WHERE c.id = challenge_participants.challenge_id
    AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON public.challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime for challenges
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;

-- ========================================
-- GROUP TODOS (shared todos)
-- ========================================
CREATE TABLE public.group_todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  completion_type TEXT NOT NULL DEFAULT 'single' CHECK (completion_type IN ('single', 'all')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group todos"
  ON public.group_todos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_todos.group_id
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can create group todos"
  ON public.group_todos FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_todos.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can delete group todos"
  ON public.group_todos FOR DELETE
  USING (auth.uid() = created_by);

-- ========================================
-- GROUP TODO COMPLETIONS
-- ========================================
CREATE TABLE public.group_todo_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  todo_id UUID NOT NULL REFERENCES public.group_todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(todo_id, user_id)
);

ALTER TABLE public.group_todo_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view completions"
  ON public.group_todo_completions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_todos gt
    JOIN public.group_members gm ON gm.group_id = gt.group_id
    WHERE gt.id = group_todo_completions.todo_id
    AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Users can mark completion"
  ON public.group_todo_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmark completion"
  ON public.group_todo_completions FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- ACTIVITY FEED
-- ========================================
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activities"
  ON public.activities FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = activities.group_id
    AND group_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can create activities"
  ON public.activities FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = activities.group_id
      AND group_members.user_id = auth.uid()
    )
  );

-- Add missing trigger for handle_new_user (was in function but trigger was missing)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
