import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useTodos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["todos", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateTodo() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      due_date?: string;
      due_time?: string;
      recurrence?: string;
      label_id?: string;
      icon?: string;
      reminder_at?: string;
    }) => {
      const { error } = await supabase
        .from("todos")
        .insert({
          title: payload.title,
          description: payload.description || null,
          user_id: user!.id,
          due_date: payload.due_date || null,
          recurrence: payload.recurrence || null,
          label_id: payload.label_id || null,
          icon: payload.icon || null,
          reminder_at: payload.reminder_at || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}

export function useUpdateTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      description?: string;
      due_date?: string | null;
      due_time?: string | null;
      recurrence?: string | null;
      label_id?: string | null;
      icon?: string | null;
      completed?: boolean;
      reminder_at?: string | null;
    }) => {
      const { error } = await supabase
        .from("todos")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}

export function useToggleTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("todos")
        .update({ completed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}

export function useDeleteTodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }),
  });
}

// Auto-reset recurring todos: check if the current period has elapsed since completion
export function shouldResetRecurringTodo(todo: any): boolean {
  if (!todo.completed || !todo.recurrence || todo.recurrence === "none") return false;
  const now = new Date();
  const updatedAt = new Date(todo.updated_at);
  
  switch (todo.recurrence) {
    case "daily": {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return updatedAt < todayStart;
    }
    case "every2days": {
      const twoDaysAgo = new Date(now.getTime() - 2 * 86400000);
      const dayStart = new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate());
      return updatedAt < dayStart;
    }
    case "weekly": {
      const day = now.getDay();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day === 0 ? 6 : day - 1));
      return updatedAt < weekStart;
    }
    case "monthly": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return updatedAt < monthStart;
    }
    default:
      return false;
  }
}
