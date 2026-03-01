import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useUnreadDMCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-dm-count", user?.id],
    queryFn: async () => {
      const lastSeen = localStorage.getItem(`dm_last_seen_${user!.id}`) || new Date().toISOString();
      const { count, error } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .neq("sender_id", user!.id)
        .gt("created_at", lastSeen);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useUnreadGroupMessageCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-group-msg-count", user?.id],
    queryFn: async () => {
      const lastSeen = localStorage.getItem(`group_msg_last_seen_${user!.id}`) || new Date().toISOString();
      const { count, error } = await supabase
        .from("group_messages")
        .select("*", { count: "exact", head: true })
        .neq("user_id", user!.id)
        .gt("created_at", lastSeen);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function markDMsAsSeen(userId: string) {
  localStorage.setItem(`dm_last_seen_${userId}`, new Date().toISOString());
}

export function markGroupMessagesAsSeen(userId: string) {
  localStorage.setItem(`group_msg_last_seen_${userId}`, new Date().toISOString());
}
