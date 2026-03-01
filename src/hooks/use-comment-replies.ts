import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useCommentReplies(commentId: string) {
  return useQuery({
    queryKey: ["comment-replies", commentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comment_replies")
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("comment_id", commentId)
        .order("created_at", { ascending: true });
      if (error) {
        const { data: fallback, error: e2 } = await supabase
          .from("post_comment_replies")
          .select("*")
          .eq("comment_id", commentId)
          .order("created_at", { ascending: true });
        if (e2) throw e2;
        return fallback;
      }
      return data;
    },
  });
}

export function useAddReply() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase.from("post_comment_replies").insert({
        comment_id: commentId,
        user_id: user!.id,
        content,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, { commentId }) => {
      qc.invalidateQueries({ queryKey: ["comment-replies", commentId] });
    },
  });
}
