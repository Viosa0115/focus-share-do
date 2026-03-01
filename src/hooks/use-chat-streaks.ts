import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useAllChatStreaks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-chat-streaks", user?.id],
    queryFn: async () => {
      // Get all friendship IDs for user
      const { data: friendships } = await supabase
        .from("friendships")
        .select("id")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .eq("status", "accepted");
      if (!friendships?.length) return [];
      const ids = friendships.map(f => f.id);
      const { data, error } = await supabase
        .from("chat_streaks")
        .select("*")
        .in("friendship_id", ids);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useChatStreak(friendshipId: string | undefined) {
  return useQuery({
    queryKey: ["chat-streak", friendshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_streaks")
        .select("*")
        .eq("friendship_id", friendshipId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!friendshipId,
  });
}

export function useUpdateChatStreak(friendshipId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ requesterId, addresseeId }: { requesterId: string; addresseeId: string }) => {
      if (!friendshipId || !user) return;
      const today = new Date().toISOString().split("T")[0];
      const isUser1 = user.id === requesterId;
      const myDateField = isUser1 ? "user1_last_msg_date" : "user2_last_msg_date";

      // Get or create streak record
      let { data: streak } = await supabase
        .from("chat_streaks")
        .select("*")
        .eq("friendship_id", friendshipId)
        .maybeSingle();

      if (!streak) {
        const insertData: any = {
          friendship_id: friendshipId,
          [myDateField]: today,
        };
        const { data: newStreak, error } = await supabase
          .from("chat_streaks")
          .insert(insertData)
          .select()
          .single();
        if (error) throw error;
        return newStreak;
      }

      // If I already messaged today, don't update streak again (max +1/day)
      const myCurrentDate = isUser1 ? streak.user1_last_msg_date : streak.user2_last_msg_date;
      if (myCurrentDate === today) return; // Already counted today

      const updateData: any = {
        [myDateField]: today,
        updated_at: new Date().toISOString(),
      };

      // Check if both users have messaged today (other already messaged today)
      const otherDate = isUser1 ? streak.user2_last_msg_date : streak.user1_last_msg_date;
      if (otherDate === today) {
        // Both messaged today - update streak (max +1)
        const lastBothDate = streak.last_both_chatted_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (lastBothDate === yesterdayStr) {
          updateData.current_streak = (streak.current_streak || 0) + 1;
        } else if (lastBothDate !== today) {
          updateData.current_streak = 1;
        }
        updateData.last_both_chatted_date = today;
        if (updateData.current_streak !== undefined) {
          updateData.best_streak = Math.max(streak.best_streak || 0, updateData.current_streak);
        }
      }

      const { error } = await supabase
        .from("chat_streaks")
        .update(updateData)
        .eq("id", streak.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-streak", friendshipId] });
    },
  });
}
