import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function usePinnedMessages(groupId: string | undefined) {
  return useQuery({
    queryKey: ["pinned-messages", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_pinned_messages")
        .select("*, group_messages(content, user_id, created_at, image_url)")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false });
      if (error) {
        // Fallback without join
        const { data: pins, error: e2 } = await supabase
          .from("group_pinned_messages")
          .select("*")
          .eq("group_id", groupId!)
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        return pins;
      }
      return data;
    },
    enabled: !!groupId,
  });
}

export function useTogglePin(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      // Check if already pinned
      const { data: existing } = await supabase
        .from("group_pinned_messages")
        .select("id")
        .eq("group_id", groupId!)
        .eq("message_id", messageId)
        .maybeSingle();

      if (existing) {
        await supabase.from("group_pinned_messages").delete().eq("id", existing.id);
      } else {
        const { error } = await supabase.from("group_pinned_messages").insert({
          group_id: groupId!,
          message_id: messageId,
          pinned_by: user!.id,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pinned-messages", groupId] }),
  });
}
