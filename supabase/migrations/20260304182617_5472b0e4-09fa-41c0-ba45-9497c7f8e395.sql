
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS reminder_at timestamptz;
ALTER TABLE public.group_todos ADD COLUMN IF NOT EXISTS reminder_at timestamptz;
ALTER TABLE public.direct_todos ADD COLUMN IF NOT EXISTS reminder_at timestamptz;

-- Allow group members to update group todos (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_todos' AND policyname = 'Members can update group todos') THEN
    CREATE POLICY "Members can update group todos" ON public.group_todos FOR UPDATE USING (
      EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_todos.group_id AND group_members.user_id = auth.uid())
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_todos' AND policyname = 'Members can delete group todos') THEN
    CREATE POLICY "Members can delete group todos" ON public.group_todos FOR DELETE USING (
      auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM group_members WHERE group_members.group_id = group_todos.group_id AND group_members.user_id = auth.uid() AND group_members.role = 'admin'
      )
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can delete friendships') THEN
    CREATE POLICY "Users can delete friendships" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
  END IF;
END $$;
