import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useFriends() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .eq("status", "accepted");
      if (error) throw error;
      // Return the friend's user_id (not our own)
      return data.map((f) => ({
        ...f,
        friend_id: f.requester_id === user!.id ? f.addressee_id : f.requester_id,
      }));
    },
    enabled: !!user,
  });
}

export function useFriendRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friend-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("addressee_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSendFriendRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hashtagCode: string) => {
      // Find user by hashtag
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("hashtag_code", hashtagCode)
        .single();
      if (pErr || !profile) throw new Error("Nutzer nicht gefunden");
      if (profile.user_id === user!.id) throw new Error("Du kannst dich nicht selbst hinzufügen");

      // Check existing friendship
      const { data: existing } = await supabase
        .from("friendships")
        .select("id")
        .or(`and(requester_id.eq.${user!.id},addressee_id.eq.${profile.user_id}),and(requester_id.eq.${profile.user_id},addressee_id.eq.${user!.id})`)
        .maybeSingle();
      if (existing) throw new Error("Anfrage existiert bereits");

      const { error } = await supabase
        .from("friendships")
        .insert({ requester_id: user!.id, addressee_id: profile.user_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useRespondFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      if (accept) {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "rejected" })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
}
