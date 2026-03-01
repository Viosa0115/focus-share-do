-- Fix 1: Avoid RLS recursion on group_members by using SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.user_id = _user_id
      AND gm.group_id = _group_id
  )
$$;

-- Recreate group_members SELECT policy without self-recursive subquery
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
ON public.group_members
FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

-- Recreate INSERT policy so admins can approve join requests by adding users
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins can add members" ON public.group_members;
CREATE POLICY "Users or admins can add members"
ON public.group_members
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR public.is_group_admin(auth.uid(), group_id)
);

-- Tighten admin update policy with WITH CHECK
DROP POLICY IF EXISTS "Admins can update members" ON public.group_members;
CREATE POLICY "Admins can update members"
ON public.group_members
FOR UPDATE
USING (public.is_group_admin(auth.uid(), group_id))
WITH CHECK (public.is_group_admin(auth.uid(), group_id));

-- Use helper function in join-request policies (avoids dependency on group_members RLS internals)
DROP POLICY IF EXISTS "Users and owners can view requests" ON public.group_join_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.group_join_requests;

CREATE POLICY "Users and owners can view requests"
ON public.group_join_requests
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = group_join_requests.group_id
      AND g.owner_id = auth.uid()
  )
  OR public.is_group_admin(auth.uid(), group_id)
);

CREATE POLICY "Admins can update requests"
ON public.group_join_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = group_join_requests.group_id
      AND g.owner_id = auth.uid()
  )
  OR public.is_group_admin(auth.uid(), group_id)
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = group_join_requests.group_id
      AND g.owner_id = auth.uid()
  )
  OR public.is_group_admin(auth.uid(), group_id)
);

-- Keep join code auto-generated server-side as fallback
ALTER TABLE public.groups
ALTER COLUMN join_code SET DEFAULT public.generate_join_code();

-- Ensure profile-based relations exist for PostgREST joins used by the app
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'friendships_requester_profile_fkey'
      AND conrelid = 'public.friendships'::regclass
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT friendships_requester_profile_fkey
      FOREIGN KEY (requester_id)
      REFERENCES public.profiles(user_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'friendships_addressee_profile_fkey'
      AND conrelid = 'public.friendships'::regclass
  ) THEN
    ALTER TABLE public.friendships
      ADD CONSTRAINT friendships_addressee_profile_fkey
      FOREIGN KEY (addressee_id)
      REFERENCES public.profiles(user_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'posts_user_profile_fkey'
      AND conrelid = 'public.posts'::regclass
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_user_profile_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(user_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'group_members_user_profile_fkey'
      AND conrelid = 'public.group_members'::regclass
  ) THEN
    ALTER TABLE public.group_members
      ADD CONSTRAINT group_members_user_profile_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(user_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'group_messages_user_id_fkey'
      AND conrelid = 'public.group_messages'::regclass
  ) THEN
    ALTER TABLE public.group_messages
      ADD CONSTRAINT group_messages_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(user_id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;