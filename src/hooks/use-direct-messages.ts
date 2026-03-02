import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { addAuraPoints } from "@/hooks/use-aura";

export function useDirectMessages(friendshipId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!friendshipId) return;
    const channel = supabase
      .channel(`dm-${friendshipId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `friendship_id=eq.${friendshipId}` },
        () => qc.invalidateQueries({ queryKey: ["direct-messages", friendshipId] })
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages", filter: `friendship_id=eq.${friendshipId}` },
        () => qc.invalidateQueries({ queryKey: ["direct-messages", friendshipId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [friendshipId, qc]);

  return useQuery({
    queryKey: ["direct-messages", friendshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("friendship_id", friendshipId!)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!friendshipId && !!user,
  });
}

export function useSendDirectMessage(friendshipId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("direct_messages").insert({
        friendship_id: friendshipId!,
        sender_id: user!.id,
        content,
      });
      if (error) throw error;
      addAuraPoints(user!.id, 1);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["direct-messages", friendshipId] }),
  });
}

export function useDirectTodos(friendshipId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["direct-todos", friendshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_todos")
        .select("*")
        .eq("friendship_id", friendshipId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!friendshipId && !!user,
  });
}

export function useCreateDirectTodo(friendshipId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      title: string;
      description?: string;
      due_date?: string;
      due_time?: string;
      label_name?: string;
      label_color?: string;
      add_to_calendar?: boolean;
    }) => {
      const { error } = await supabase.from("direct_todos").insert({
        friendship_id: friendshipId!,
        created_by: user!.id,
        title: params.title,
        description: params.description || "",
        due_date: params.due_date || null,
        due_time: params.due_time || null,
        label_name: params.label_name || null,
        label_color: params.label_color || null,
        add_to_calendar: params.add_to_calendar || false,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["direct-todos", friendshipId] }),
  });
}

export function useToggleDirectTodo(friendshipId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ todoId, completedBy }: { todoId: string; completedBy: string[] }) => {
      const userId = user!.id;
      const isCompleted = completedBy.includes(userId);
      const newCompleted = isCompleted
        ? completedBy.filter(id => id !== userId)
        : [...completedBy, userId];
      const { error } = await supabase
        .from("direct_todos")
        .update({ completed_by: newCompleted })
        .eq("id", todoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["direct-todos", friendshipId] }),
  });
}

export function useDirectChallenges(friendshipId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["direct-challenges", friendshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("direct_challenges")
        .select("*")
        .eq("friendship_id", friendshipId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!friendshipId && !!user,
  });
}

export function useCreateDirectChallenge(friendshipId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; challenge_type: string }) => {
      const { error } = await supabase.from("direct_challenges").insert({
        friendship_id: friendshipId!,
        created_by: user!.id,
        name: params.name,
        challenge_type: params.challenge_type,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["direct-challenges", friendshipId] }),
  });
}

export function useUpdateDirectChallengeScore(friendshipId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, field, delta }: { challengeId: string; field: "score_creator" | "score_friend"; delta: number }) => {
      const { data: ch } = await supabase.from("direct_challenges").select("*").eq("id", challengeId).single();
      if (!ch) throw new Error("Not found");
      const current = (ch as any)[field] || 0;
      const { error } = await supabase.from("direct_challenges").update({ [field]: Math.max(0, current + delta) }).eq("id", challengeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["direct-challenges", friendshipId] }),
  });
}
