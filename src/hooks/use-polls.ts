import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useGroupPolls(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group-polls", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_polls")
        .select("*")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}

export function useCreatePoll(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { title: string; options: string[]; ends_at?: string }) => {
      const { error } = await supabase.from("group_polls").insert({
        group_id: groupId!,
        created_by: user!.id,
        title: params.title,
        options: params.options,
        votes: {},
        ends_at: params.ends_at || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-polls", groupId] }),
  });
}

export function useVotePoll(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pollId, optionIndex, currentVotes }: { pollId: string; optionIndex: number; currentVotes: Record<string, number> }) => {
      const newVotes = { ...currentVotes, [user!.id]: optionIndex };
      const { error } = await supabase.from("group_polls").update({ votes: newVotes } as any).eq("id", pollId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-polls", groupId] }),
  });
}
