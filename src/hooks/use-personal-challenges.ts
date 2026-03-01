import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function usePersonalChallenges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["personal-challenges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_challenges")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreatePersonalChallenge() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, challenge_type, label_id, end_date, end_time }: {
      name: string;
      challenge_type: string;
      label_id?: string;
      end_date?: string;
      end_time?: string;
    }) => {
      const { error } = await supabase
        .from("personal_challenges")
        .insert({
          user_id: user!.id,
          name,
          challenge_type,
          label_id: label_id || null,
          end_date: end_date || null,
          end_time: end_time || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-challenges"] }),
  });
}

export function useUpdatePersonalChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("personal_challenges")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-challenges"] }),
  });
}

export function useDeletePersonalChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-challenges"] }),
  });
}
