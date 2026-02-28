import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useGroupTodos(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-todos", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_todos")
        .select("*, group_todo_completions(*)")
        .eq("group_id", groupId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!user,
  });
}

export function useCreateGroupTodo(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, completionType, dueDate, dueTime, recurrence }: {
      title: string;
      completionType: "single" | "all";
      dueDate?: string;
      dueTime?: string;
      recurrence?: string;
    }) => {
      const { error } = await supabase
        .from("group_todos")
        .insert({
          group_id: groupId!,
          created_by: user!.id,
          title,
          completion_type: completionType,
          due_date: dueDate || null,
          due_time: dueTime || null,
          recurrence: recurrence || null,
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-todos", groupId] }),
  });
}

export function useToggleGroupTodo(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ todoId, completed }: { todoId: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from("group_todo_completions")
          .insert({ todo_id: todoId, user_id: user!.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("group_todo_completions")
          .delete()
          .eq("todo_id", todoId)
          .eq("user_id", user!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-todos", groupId] }),
  });
}
