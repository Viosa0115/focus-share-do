import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useChallenges(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["challenges", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*, challenge_participants(*)")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!user,
  });
}

export function useCreateChallenge(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; challenge_type: "count" | "time" | "endurance"; start_date: string; duration_days: number }) => {
      const { data: createdChallenge, error } = await supabase
        .from("challenges")
        .insert({ ...params, group_id: groupId!, created_by: user!.id })
        .select("id, name")
        .single();
      if (error) throw error;

      const [{ data: members }, { data: group }, { data: profile }] = await Promise.all([
        supabase.from("group_members").select("user_id").eq("group_id", groupId!),
        supabase.from("groups").select("name").eq("id", groupId!).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("user_id", user!.id).maybeSingle(),
      ]);

      const creatorName = profile?.display_name || "Jemand";
      const groupName = group?.name || "Gruppe";
      const recipients = (members ?? []).map((member: any) => member.user_id).filter((id: string) => id !== user!.id);

      if (recipients.length > 0) {
        await supabase.from("notifications").insert(
          recipients.map((recipientId: string) => ({
            user_id: recipientId,
            type: "new_challenge",
            title: "Neue Challenge erstellt 🏆",
            body: `${creatorName} hat "${createdChallenge.name}" in ${groupName} erstellt`,
            from_user_id: user!.id,
            from_user_name: creatorName,
            reference_type: "challenge",
            reference_id: createdChallenge.id,
            group_id: groupId!,
            group_name: groupName,
          })) as any
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}

export function useJoinChallenge(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from("challenge_participants")
        .insert({ challenge_id: challengeId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}

export function useUpdateScore(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, delta }: { challengeId: string; delta: number }) => {
      // Get current score first
      const { data: current } = await supabase
        .from("challenge_participants")
        .select("score")
        .eq("challenge_id", challengeId)
        .eq("user_id", user!.id)
        .single();
      const newScore = Math.max(0, (current?.score || 0) + delta);
      const { error } = await supabase
        .from("challenge_participants")
        .update({ score: newScore })
        .eq("challenge_id", challengeId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}

export function useSaveTime(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, timeMs }: { challengeId: string; timeMs: number }) => {
      const { data: current } = await supabase
        .from("challenge_participants")
        .select("best_time_ms")
        .eq("challenge_id", challengeId)
        .eq("user_id", user!.id)
        .single();
      const best = current?.best_time_ms ? Math.min(current.best_time_ms, timeMs) : timeMs;
      const { error } = await supabase
        .from("challenge_participants")
        .update({ best_time_ms: best })
        .eq("challenge_id", challengeId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}

export function useGiveUp(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from("challenge_participants")
        .update({ given_up: true, ended_at: new Date().toISOString() })
        .eq("challenge_id", challengeId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }),
  });
}
