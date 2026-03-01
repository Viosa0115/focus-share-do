import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useUnreadDMCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-dm-count", user?.id],
    queryFn: async () => {
      const lastSeen = localStorage.getItem(`dm_last_seen_${user!.id}`) || "1970-01-01T00:00:00.000Z";
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
      // Sum up per-group unread counts
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id);
      if (!memberships?.length) return 0;
      let total = 0;
      for (const m of memberships) {
        const lastSeen = localStorage.getItem(`group_msg_seen_${user!.id}_${m.group_id}`) || "1970-01-01T00:00:00.000Z";
        const { count } = await supabase
          .from("group_messages")
          .select("*", { count: "exact", head: true })
          .eq("group_id", m.group_id)
          .neq("user_id", user!.id)
          .gt("created_at", lastSeen);
        total += count || 0;
      }
      return total;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useUnreadGroupCountPerGroup(groupIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-group-per-group", user?.id, groupIds.join(",")],
    queryFn: async () => {
      if (!groupIds.length) return {};
      const result: Record<string, number> = {};
      await Promise.all(
        groupIds.map(async (gid) => {
          const lastSeen = localStorage.getItem(`group_msg_seen_${user!.id}_${gid}`) || "1970-01-01T00:00:00.000Z";
          const { count } = await supabase
            .from("group_messages")
            .select("*", { count: "exact", head: true })
            .eq("group_id", gid)
            .neq("user_id", user!.id)
            .gt("created_at", lastSeen);
          result[gid] = count || 0;
        })
      );
      return result;
    },
    enabled: !!user && groupIds.length > 0,
    refetchInterval: 15000,
  });
}

export function markDMsAsSeen(userId: string) {
  localStorage.setItem(`dm_last_seen_${userId}`, new Date().toISOString());
}

export function markGroupMessagesAsSeen(userId: string) {
  // Legacy global - keep for bottom nav
  localStorage.setItem(`group_msg_last_seen_${userId}`, new Date().toISOString());
}

export function markGroupAsSeen(userId: string, groupId: string) {
  localStorage.setItem(`group_msg_seen_${userId}_${groupId}`, new Date().toISOString());
}
