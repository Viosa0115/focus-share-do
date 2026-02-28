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
        .select(`
          *,
          requester_profile:profiles!friendships_requester_id_fkey(user_id, display_name, avatar_url, hashtag_code),
          addressee_profile:profiles!friendships_addressee_id_fkey(user_id, display_name, avatar_url, hashtag_code)
        `)
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      if (error) throw error;
      return data.map((f: any) => ({
        ...f,
        friend_id: f.requester_id === user!.id ? f.addressee_id : f.requester_id,
        friend_profile: f.requester_id === user!.id ? f.addressee_profile : f.requester_profile,
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
        .select(`
          *,
          requester_profile:profiles!friendships_requester_id_fkey(user_id, display_name, avatar_url, hashtag_code)
        `)
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
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("hashtag_code", hashtagCode)
        .single();
      if (pErr || !profile) throw new Error("Nutzer nicht gefunden");
      if (profile.user_id === user!.id) throw new Error("Du kannst dich nicht selbst hinzufügen");

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
}

export function useRespondFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
}
