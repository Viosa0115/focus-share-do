import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function usePosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles!posts_user_id_fkey(display_name, avatar_url, hashtag_code, is_private)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
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
