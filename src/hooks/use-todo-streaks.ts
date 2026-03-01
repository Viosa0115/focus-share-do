import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useTodoStreaks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["todo-streaks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todo_streaks")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Get current period key based on recurrence
function getCurrentPeriod(recurrence: string): string {
  const now = new Date();
  if (recurrence === "daily") {
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  if (recurrence === "weekly") {
    // ISO week: year-weeknumber
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  }
  if (recurrence === "monthly") {
    return now.toISOString().slice(0, 7); // YYYY-MM
  }
  return now.toISOString().slice(0, 10);
}

function getPreviousPeriod(recurrence: string): string {
  const now = new Date();
  if (recurrence === "daily") {
    const prev = new Date(now.getTime() - 86400000);
    return prev.toISOString().slice(0, 10);
  }
  if (recurrence === "weekly") {
    const prev = new Date(now.getTime() - 7 * 86400000);
    const jan1 = new Date(prev.getFullYear(), 0, 1);
    const week = Math.ceil(((prev.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${prev.getFullYear()}-W${week}`;
  }
  if (recurrence === "monthly") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return prev.toISOString().slice(0, 7);
  }
  return new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
}

export function useUpdateStreak() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ todoId, todoTitle, recurrence }: { todoId: string; todoTitle: string; recurrence: string }) => {
      const currentPeriod = getCurrentPeriod(recurrence);
      const prevPeriod = getPreviousPeriod(recurrence);

      // Get existing streak
      const { data: existing } = await supabase
        .from("todo_streaks")
        .select("*")
        .eq("user_id", user!.id)
        .eq("todo_id", todoId)
        .maybeSingle();

      if (!existing) {
        // Create new streak
        await supabase.from("todo_streaks").insert({
          user_id: user!.id,
          todo_id: todoId,
          todo_title: todoTitle,
          recurrence,
          current_streak: 1,
          best_streak: 1,
          last_completed_period: currentPeriod,
        });
        return 1;
      }

      // Already completed this period
      if (existing.last_completed_period === currentPeriod) {
        return existing.current_streak;
      }

      // Check if previous period was completed (streak continues)
      const newStreak = existing.last_completed_period === prevPeriod
        ? existing.current_streak + 1
        : 1;

      const newBest = Math.max(existing.best_streak, newStreak);

      await supabase.from("todo_streaks").update({
        current_streak: newStreak,
        best_streak: newBest,
        last_completed_period: currentPeriod,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);

      return newStreak;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todo-streaks"] }),
  });
}

export function useResetStreak() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (todoId: string) => {
      await supabase.from("todo_streaks")
        .update({ current_streak: 0, last_completed_period: null, updated_at: new Date().toISOString() })
        .eq("user_id", user!.id)
        .eq("todo_id", todoId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["todo-streaks"] }),
  });
}
