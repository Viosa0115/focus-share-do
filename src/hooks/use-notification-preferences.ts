import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create default preferences
        const { data: created, error: createErr } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user!.id } as any)
          .select()
          .single();
        if (createErr) throw createErr;
        return created;
      }
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, boolean>) => {
      const { error } = await supabase
        .from("notification_preferences")
        .update(updates as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
