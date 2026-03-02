import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useFriendSuggestions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friend-suggestions", user?.id],
    queryFn: async () => {
      // Get existing friendships
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      const connectedIds = new Set<string>([user!.id]);
      (friendships || []).forEach((f: any) => {
        connectedIds.add(f.requester_id);
        connectedIds.add(f.addressee_id);
      });
      // Get blocked users
      const { data: blocks } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user!.id);
      (blocks || []).forEach((b: any) => connectedIds.add(b.blocked_id));

      // Get random public profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, hashtag_code, bio, aura")
        .eq("is_private", false)
        .limit(50);
      if (error) throw error;
      // Filter out connected users and shuffle
      const filtered = (profiles || []).filter((p: any) => !connectedIds.has(p.user_id));
      // Random shuffle and take 10
      for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
      return filtered.slice(0, 10);
    },
    enabled: !!user,
    staleTime: 60000,
  });
}
