import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function usePostLikes(postId: string) {
  return useQuery({
    queryKey: ["post-likes", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_likes")
        .select("*")
        .eq("post_id", postId);
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleLike() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ["post-likes", postId] });
      qc.invalidateQueries({ queryKey: ["all-post-likes"] });
    },
  });
}

export function useAllPostLikes(postIds: string[]) {
  return useQuery({
    queryKey: ["all-post-likes", postIds],
    queryFn: async () => {
      if (!postIds.length) return [];
      const { data, error } = await supabase
        .from("post_likes")
        .select("*")
        .in("post_id", postIds);
      if (error) throw error;
      return data;
    },
    enabled: postIds.length > 0,
  });
}

export function usePostComments(postId: string) {
  return useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) {
        // Fallback without join
        const { data: comments, error: e2 } = await supabase
          .from("post_comments")
          .select("*")
          .eq("post_id", postId)
          .order("created_at", { ascending: true });
        if (e2) throw e2;
        return comments;
      }
      return data;
    },
  });
}

export function useAddComment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { error } = await supabase
        .from("post_comments")
        .insert({ post_id: postId, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      qc.invalidateQueries({ queryKey: ["post-comments", postId] });
    },
  });
}

export function useRespectPoints() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["respect-today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("respect_points")
        .select("*")
        .eq("from_user_id", user!.id)
        .eq("given_at", today);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useGiveRespect() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, toUserId }: { postId: string; toUserId: string }) => {
      const { error } = await supabase
        .from("respect_points")
        .insert({ from_user_id: user!.id, to_user_id: toUserId, post_id: postId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["respect-today"] });
      qc.invalidateQueries({ queryKey: ["all-respect"] });
    },
  });
}

export function useAllRespectForPosts(postIds: string[]) {
  return useQuery({
    queryKey: ["all-respect", postIds],
    queryFn: async () => {
      if (!postIds.length) return [];
      const { data, error } = await supabase
        .from("respect_points")
        .select("*")
        .in("post_id", postIds);
      if (error) throw error;
      return data;
    },
    enabled: postIds.length > 0,
  });
}
