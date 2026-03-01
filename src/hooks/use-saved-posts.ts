import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useSavedPosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_posts")
        .select("*, posts(*, profiles:profiles!posts_user_profile_fkey(display_name, avatar_url, hashtag_code, is_private))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useToggleSavePost() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, saved }: { postId: string; saved: boolean }) => {
      if (saved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .insert({ post_id: postId, user_id: user!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });
}

export function useMySavedPostIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-saved-post-ids", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((d: any) => d.post_id));
    },
    enabled: !!user,
  });
}
