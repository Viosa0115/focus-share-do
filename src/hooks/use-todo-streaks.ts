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

// Check if the streak is still valid (not broken)
export function getDisplayStreak(streak: any): number {
  if (!streak || streak.current_streak <= 0) return 0;
  const now = new Date();
  const currentPeriod = getCurrentPeriod(streak.recurrence);
  const prevPeriod = getPreviousPeriod(streak.recurrence);
  
  // Streak is valid if last completed period is current or previous period
  if (streak.last_completed_period === currentPeriod || streak.last_completed_period === prevPeriod) {
    return streak.current_streak;
  }
  // Streak is broken
  return 0;
}

function getCurrentPeriod(recurrence: string): string {
  const now = new Date();
  if (recurrence === "daily") {
    return now.toISOString().slice(0, 10);
  }
  if (recurrence === "every2days") {
    return now.toISOString().slice(0, 10);
  }
  if (recurrence === "weekly") {
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  }
  if (recurrence === "monthly") {
    return now.toISOString().slice(0, 7);
  }
  return now.toISOString().slice(0, 10);
}

function getPreviousPeriod(recurrence: string): string {
  const now = new Date();
  if (recurrence === "daily") {
    const prev = new Date(now.getTime() - 86400000);
    return prev.toISOString().slice(0, 10);
  }
  if (recurrence === "every2days") {
    const prev = new Date(now.getTime() - 2 * 86400000);
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

      const { data: existing } = await supabase
        .from("todo_streaks")
        .select("*")
        .eq("user_id", user!.id)
        .eq("todo_id", todoId)
        .maybeSingle();

      if (!existing) {
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

      if (existing.last_completed_period === currentPeriod) {
        return existing.current_streak;
      }

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
