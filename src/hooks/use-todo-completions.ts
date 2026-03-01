import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useTodoCompletions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["todo-completions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todo_completions")
        .select("*, todo_labels(name, color)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSaveTodoCompletion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      todo_id: string;
      title: string;
      description?: string | null;
      recurrence?: string | null;
      label_id?: string | null;
    }) => {
      const { error } = await supabase.from("todo_completions").insert({
        user_id: user!.id,
        todo_id: params.todo_id,
        title: params.title,
        description: params.description || null,
        recurrence: params.recurrence || null,
        label_id: params.label_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todo-completions"] }),
  });
}
