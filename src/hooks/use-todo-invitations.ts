import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useTodoInvitations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["todo-invitations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todo_invitations")
        .select("*, todos(title, description, due_date, due_time, recurrence, label_id)")
        .eq("to_user_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) {
        const { data: fallback, error: e2 } = await supabase
          .from("todo_invitations")
          .select("*")
          .eq("to_user_id", user!.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        return fallback;
      }
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateTodoInvitation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ todoId, toUserId }: { todoId: string; toUserId: string }) => {
      const { error } = await supabase.from("todo_invitations").insert({
        todo_id: todoId,
        from_user_id: user!.id,
        to_user_id: toUserId,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todo-invitations"] }),
  });
}

export function useRespondTodoInvitation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId, accept, todo }: { invitationId: string; accept: boolean; todo?: any }) => {
      await supabase.from("todo_invitations").update({ status: accept ? "accepted" : "declined" } as any).eq("id", invitationId);
      
      if (accept && todo) {
        // Create a copy of the todo for the accepting user
        const { error } = await supabase.from("todos").insert({
          user_id: user!.id,
          title: todo.title,
          description: todo.description || "",
          due_date: todo.due_date,
          due_time: todo.due_time,
          recurrence: todo.recurrence,
          label_id: todo.label_id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todo-invitations"] });
      qc.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
