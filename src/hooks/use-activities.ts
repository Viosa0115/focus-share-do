import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useActivities() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["activities", user?.id],
    queryFn: async () => {
      // Get all group IDs user belongs to
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id);
      if (!memberships?.length) return [];
      const groupIds = memberships.map((m) => m.group_id);
      
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
