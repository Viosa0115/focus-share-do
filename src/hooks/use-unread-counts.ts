import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useUnreadDMCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-dm-count", user?.id],
    queryFn: async () => {
      // Get all friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      if (!friendships?.length) return 0;
      let total = 0;
      for (const f of friendships) {
        const lastSeen = localStorage.getItem(`dm_seen_${user!.id}_${f.id}`) || "1970-01-01T00:00:00.000Z";
        const { count } = await supabase
          .from("direct_messages")
          .select("*", { count: "exact", head: true })
          .eq("friendship_id", f.id)
          .neq("sender_id", user!.id)
          .gt("created_at", lastSeen);
        total += count || 0;
      }
      return total;
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
  // Legacy - kept for compatibility
  localStorage.setItem(`dm_last_seen_${userId}`, new Date().toISOString());
}

export function markGroupMessagesAsSeen(userId: string) {
  localStorage.setItem(`group_msg_last_seen_${userId}`, new Date().toISOString());
}

export function markGroupAsSeen(userId: string, groupId: string) {
  localStorage.setItem(`group_msg_seen_${userId}_${groupId}`, new Date().toISOString());
}

export function markDMFriendshipAsSeen(userId: string, friendshipId: string) {
  localStorage.setItem(`dm_seen_${userId}_${friendshipId}`, new Date().toISOString());
}
