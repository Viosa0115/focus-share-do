import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { addAuraPoints } from "@/hooks/use-aura";

const PROFILE_FIELDS = "user_id, display_name, avatar_url, hashtag_code";

const mapFriendForUser = (friendship: any, currentUserId: string) => ({
  ...friendship,
  friend_id: friendship.requester_id === currentUserId ? friendship.addressee_id : friendship.requester_id,
  friend_profile:
    friendship.requester_id === currentUserId ? friendship.addressee_profile : friendship.requester_profile,
});

async function withProfiles(friendships: any[]) {
  if (!friendships.length) return friendships;
  const ids = Array.from(
    new Set(friendships.flatMap((f: any) => [f.requester_id, f.addressee_id]).filter(Boolean))
  );
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .in("user_id", ids);
  if (error) throw error;

  const byUserId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  return friendships.map((f: any) => ({
    ...f,
    requester_profile: byUserId.get(f.requester_id) ?? null,
    addressee_profile: byUserId.get(f.addressee_id) ?? null,
  }));
}

export function useFriends() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const joined = await supabase
        .from("friendships")
        .select(`
          *,
          requester_profile:profiles!friendships_requester_profile_fkey(user_id, display_name, avatar_url, hashtag_code),
          addressee_profile:profiles!friendships_addressee_profile_fkey(user_id, display_name, avatar_url, hashtag_code)
        `)
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);

      const friendships = joined.error
        ? await (async () => {
            const { data, error } = await supabase
              .from("friendships")
              .select("*")
              .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
            if (error) throw error;
            return withProfiles(data ?? []);
          })()
        : joined.data ?? [];

      return friendships.map((f: any) => mapFriendForUser(f, user!.id));
    },
    enabled: !!user,
  });
}

export function useFriendRequests() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friend-requests", user?.id],
    queryFn: async () => {
      const joined = await supabase
        .from("friendships")
        .select(`
          *,
          requester_profile:profiles!friendships_requester_profile_fkey(user_id, display_name, avatar_url, hashtag_code)
        `)
        .eq("addressee_id", user!.id)
        .eq("status", "pending");

      if (!joined.error) return joined.data ?? [];

      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("addressee_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;

      const enriched = await withProfiles(data ?? []);
      return enriched;
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
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error("Nutzer nicht gefunden");
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
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", id);
      if (error) throw error;
      if (accept && user) {
        addAuraPoints(user.id, 15);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });
}

