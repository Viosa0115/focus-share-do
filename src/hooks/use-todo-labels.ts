import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useTodoLabels() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["todo-labels", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todo_labels")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateLabel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await supabase
        .from("todo_labels")
        .insert({ user_id: user!.id, name, color });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todo-labels"] }),
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todo_labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todo-labels"] }),
  });
}
