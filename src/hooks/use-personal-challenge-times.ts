import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useChallengeTimes(challengeId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["challenge-times", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_challenge_times")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", user!.id)
        .order("time_ms", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!challengeId,
  });
}

export function useSaveChallengeTime() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, timeMs }: { challengeId: string; timeMs: number }) => {
      // Get current count for this challenge
      const { count } = await supabase
        .from("personal_challenge_times")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", challengeId)
        .eq("user_id", user!.id);

      // Insert the new time
      await supabase.from("personal_challenge_times").insert({
        challenge_id: challengeId,
        user_id: user!.id,
        time_ms: timeMs,
      });

      // If more than 10, remove the slowest one(s)
      if ((count ?? 0) >= 10) {
        const { data: times } = await supabase
          .from("personal_challenge_times")
          .select("id, time_ms")
          .eq("challenge_id", challengeId)
          .eq("user_id", user!.id)
          .order("time_ms", { ascending: false });
        
        if (times && times.length > 10) {
          const toDelete = times.slice(0, times.length - 10);
          for (const t of toDelete) {
            await supabase.from("personal_challenge_times").delete().eq("id", t.id);
          }
        }
      }
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["challenge-times", vars.challengeId] }),
  });
}
