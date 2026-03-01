import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function usePosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      const joined = await supabase
        .from("posts")
        .select("*, profiles:profiles!posts_user_profile_fkey(display_name, avatar_url, hashtag_code, is_private)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!joined.error) return joined.data;

      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (postsError) throw postsError;
      if (!posts?.length) return posts;

      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, hashtag_code, is_private")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;

      const byUserId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return posts.map((post: any) => ({
        ...post,
        profiles: byUserId.get(post.user_id) ?? null,
      }));
    },
    enabled: !!user,
  });
}

export function useCreatePost() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      content: string;
      image_url?: string | null;
      todo_id?: string | null;
      group_todo_id?: string | null;
      group_id?: string | null;
      tagged_user_ids?: string[];
    }) => {
      const { error } = await supabase.from("posts").insert({
        user_id: user!.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}
