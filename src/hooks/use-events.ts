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
      const { data: createdEvent, error } = await supabase
        .from("group_events")
        .insert({ ...params, group_id: groupId!, created_by: user!.id })
        .select("id, name")
        .single();
      if (error) throw error;

      const [{ data: members }, { data: group }, { data: profile }] = await Promise.all([
        supabase.from("group_members").select("user_id").eq("group_id", groupId!),
        supabase.from("groups").select("name").eq("id", groupId!).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("user_id", user!.id).maybeSingle(),
      ]);

      const creatorName = profile?.display_name || "Jemand";
      const groupName = group?.name || "Gruppe";
      const recipients = (members ?? []).map((member: any) => member.user_id).filter((id: string) => id !== user!.id);

      if (recipients.length > 0) {
        await supabase.from("notifications").insert(
          recipients.map((recipientId: string) => ({
            user_id: recipientId,
            type: "new_event",
            title: "Neues Event erstellt 📅",
            body: `${creatorName} hat "${createdEvent.name}" in ${groupName} erstellt`,
            from_user_id: user!.id,
            from_user_name: creatorName,
            reference_type: "event",
            reference_id: createdEvent.id,
            group_id: groupId!,
            group_name: groupName,
          })) as any
        );
      }
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
