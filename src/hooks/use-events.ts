import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useGroupEvents(groupId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["group-events", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_events")
        .select("*, event_rsvps(*)")
        .eq("group_id", groupId!)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!user,
  });
}

export function useCreateEvent(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; description: string; event_date: string; start_time: string; end_time: string }) => {
      const { error } = await supabase
        .from("group_events")
        .insert({ ...params, group_id: groupId!, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-events", groupId] }),
  });
}

export function useRsvp(groupId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: "attending" | "declined" }) => {
      const { data: existing } = await supabase
        .from("event_rsvps")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from("event_rsvps")
          .update({ status })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("event_rsvps")
          .insert({ event_id: eventId, user_id: user!.id, status });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group-events", groupId] }),
  });
}
