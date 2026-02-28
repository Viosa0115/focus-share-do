import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export function useJoinRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("join-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_join_requests" },
        () => qc.invalidateQueries({ queryKey: ["join-requests"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["join-requests", user?.id],
    queryFn: async () => {
      // Get groups where user is admin/owner
      const { data: myGroups } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id)
        .eq("role", "admin");
      if (!myGroups?.length) return [];
      const groupIds = myGroups.map(g => g.group_id);

      const { data, error } = await supabase
        .from("group_join_requests")
        .select("*")
        .in("group_id", groupIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Enrich with profile and group names
      const enriched = await Promise.all(
        data.map(async (req) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url, hashtag_code")
            .eq("user_id", req.user_id)
            .single();
          const { data: group } = await supabase
            .from("groups")
            .select("name")
            .eq("id", req.group_id)
            .single();
          return { ...req, profile, group_name: group?.name };
        })
      );
      return enriched;
    },
    enabled: !!user,
  });
}

export function useRespondJoinRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, accept, groupId, userId }: { requestId: string; accept: boolean; groupId: string; userId: string }) => {
      if (accept) {
        // Add to group_members
        const { error: memberErr } = await supabase.from("group_members").insert({
          group_id: groupId,
          user_id: userId,
          role: "member",
        });
        if (memberErr) throw memberErr;
      }
      // Update request status
      const { error } = await supabase
        .from("group_join_requests")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useCreateJoinRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      // Check if already a member
      const { data: existing } = await supabase
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (existing) throw new Error("Du bist bereits Mitglied");

      // Check if request already exists
      const { data: existingReq } = await supabase
        .from("group_join_requests")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user!.id)
        .eq("status", "pending")
        .maybeSingle();
      if (existingReq) throw new Error("Anfrage wurde bereits gesendet");

      const { error } = await supabase
        .from("group_join_requests")
        .insert({ group_id: groupId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["join-requests"] }),
  });
}
