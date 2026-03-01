import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useAura() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aura", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("aura")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return (data as any)?.aura ?? 0;
    },
    enabled: !!user,
  });
}

export function useAuraRanking() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["aura-ranking", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, aura, display_name")
        .order("aura", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const rank = ((data ?? []) as any[]).findIndex((p: any) => p.user_id === user!.id) + 1;
      return { rank, total: (data ?? []).length };
    },
    enabled: !!user,
  });
}

export function useAddAura() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (points: number) => {
      // Get current aura
      const { data: profile } = await supabase
        .from("profiles")
        .select("aura")
        .eq("user_id", user!.id)
        .single();
      const currentAura = (profile as any)?.aura ?? 0;
      const { error } = await supabase
        .from("profiles")
        .update({ aura: currentAura + points } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aura"] });
      qc.invalidateQueries({ queryKey: ["aura-ranking"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
