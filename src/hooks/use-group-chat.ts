import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export function useGroupMessages(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        () => qc.invalidateQueries({ queryKey: ["group-messages", groupId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, qc]);

  return useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_messages")
        .select("*, profiles!group_messages_user_id_fkey(display_name, avatar_url)")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        const { data: msgs, error: e2 } = await supabase
          .from("group_messages")
          .select("*")
          .eq("group_id", groupId!)
          .order("created_at", { ascending: true })
          .limit(200);
        if (e2) throw e2;
        return msgs;
      }
      return data;
    },
    enabled: !!groupId && !!user,
  });
}

export function useSendMessage(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from("group_messages")
        .insert({ group_id: groupId!, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-messages", groupId] }),
  });
}

// Get all media (images/videos) from group chat messages
export function useGroupChatMedia(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-chat-media", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_messages")
        .select("id, image_url, user_id, created_at")
        .eq("group_id", groupId!)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data?.filter(m => m.image_url) || [];
    },
    enabled: !!groupId,
  });
}
