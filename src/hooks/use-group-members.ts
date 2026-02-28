import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useGroupMembers(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("*, profiles(display_name, avatar_url, hashtag_code)")
        .eq("group_id", groupId!);
      if (error) {
        // Fallback without join
        const { data: d2, error: e2 } = await supabase
          .from("group_members")
          .select("*")
          .eq("group_id", groupId!);
        if (e2) throw e2;
        return d2;
      }
      return data;
    },
    enabled: !!groupId && !!user,
  });
}
