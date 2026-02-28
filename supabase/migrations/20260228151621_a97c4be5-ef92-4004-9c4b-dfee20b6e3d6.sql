
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  hashtag_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to generate random hashtag code
CREATE OR REPLACE FUNCTION public.generate_hashtag_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, hashtag_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    public.generate_hashtag_code()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Todos table
CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own todos" ON public.todos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own todos" ON public.todos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON public.todos FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON public.todos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- View pinned todos publicly
CREATE POLICY "Anyone can view pinned todos" ON public.todos FOR SELECT TO authenticated USING (pinned = true);

-- Groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  join_code TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  has_todos BOOLEAN NOT NULL DEFAULT true,
  has_challenges BOOLEAN NOT NULL DEFAULT false,
  has_events BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Group members
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Function to generate 6-char join code
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Group policies: members can view their groups
CREATE POLICY "Members can view groups" ON public.groups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = groups.id AND group_members.user_id = auth.uid()));
CREATE POLICY "Owner can view own groups" ON public.groups FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Authenticated can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update groups" ON public.groups FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owner can delete groups" ON public.groups FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Group members policies
CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()));
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Friends table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can create friendships" ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update own friendships" ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON public.todos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
