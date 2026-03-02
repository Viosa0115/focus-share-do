import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useFriendLastMessages(friendshipIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friend-last-messages", friendshipIds.join(",")],
    queryFn: async () => {
      if (!friendshipIds.length) return {};
      const result: Record<string, { content: string; created_at: string; sender_id: string }> = {};
      
      await Promise.all(
        friendshipIds.map(async (fid) => {
          const { data } = await supabase
            .from("direct_messages")
            .select("content, created_at, sender_id")
            .eq("friendship_id", fid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) result[fid] = data;
        })
      );
      return result;
    },
    enabled: !!user && friendshipIds.length > 0,
    refetchInterval: 15000,
  });
}

export function useUnreadDMCountPerFriend(friendshipIds: string[]) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["unread-dm-per-friend", user?.id, friendshipIds.join(",")],
    queryFn: async () => {
      if (!friendshipIds.length) return {};
      const result: Record<string, number> = {};
      
      await Promise.all(
        friendshipIds.map(async (fid) => {
          const lastSeen = localStorage.getItem(`dm_seen_${user!.id}_${fid}`) || "1970-01-01T00:00:00.000Z";
          const { count } = await supabase
            .from("direct_messages")
            .select("*", { count: "exact", head: true })
            .eq("friendship_id", fid)
            .neq("sender_id", user!.id)
            .gt("created_at", lastSeen);
          result[fid] = count || 0;
        })
      );
      return result;
    },
    enabled: !!user && friendshipIds.length > 0,
    refetchInterval: 15000,
  });
}
