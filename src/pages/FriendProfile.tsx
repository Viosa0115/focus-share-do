import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Instagram, ExternalLink, UserPlus, UserMinus, Ban } from "lucide-react";
import { useFriends, useSendFriendRequest } from "@/hooks/use-friends";
import { useBlockUser } from "@/hooks/use-blocked-users";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const FriendProfile = () => {
  const { id: friendshipId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: friends = [] } = useFriends();
  const blockUser = useBlockUser();

  const friendship = (friends as any[]).find((f: any) => f.id === friendshipId);
  const friendProfile = friendship?.friend_profile;
  const friendUserId = friendship?.friend_id;

  const { data: fullProfile } = useQuery({
    queryKey: ["friend-profile", friendUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", friendUserId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!friendUserId,
  });

  const profile = fullProfile || friendProfile;

  const handleRemoveFriend = async () => {
    if (!confirm("Freund wirklich entfernen?")) return;
    // Delete the friendship (user can delete if they are requester or addressee - using update to rejected)
    await supabase.from("friendships").update({ status: "removed" } as any).eq("id", friendshipId!);
    qc.invalidateQueries({ queryKey: ["friends"] });
    toast({ title: "Freund entfernt" });
    navigate("/friends");
  };

  const handleBlock = async () => {
    if (!confirm("Nutzer wirklich blockieren? Du wirst keine Nachrichten mehr erhalten.")) return;
    if (friendUserId) {
      blockUser.mutate(friendUserId);
      // Also remove friendship
      await supabase.from("friendships").update({ status: "blocked" } as any).eq("id", friendshipId!);
      qc.invalidateQueries({ queryKey: ["friends"] });
      toast({ title: "Nutzer blockiert 🚫" });
      navigate("/friends");
    }
  };

  const socialPlatforms = [
    { key: "instagram", label: "Instagram", prefix: "@", urlBase: "https://instagram.com/" },
    { key: "tiktok", label: "TikTok", prefix: "@", urlBase: "https://tiktok.com/@" },
    { key: "pinterest", label: "Pinterest", prefix: "@", urlBase: "https://pinterest.com/" },
    { key: "spotify", label: "Spotify", prefix: "", urlBase: "" },
    { key: "snapchat", label: "Snapchat", prefix: "@", urlBase: "https://snapchat.com/add/" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-foreground">Profil</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold text-secondary-foreground">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-semibold text-foreground">{profile?.display_name || "Unbekannt"}</h2>
            {(profile as any)?.aura !== undefined && (
              <p className="text-sm font-bold text-primary">✨ {(profile as any)?.aura || 0} Aura</p>
            )}
            {profile?.hashtag_code && (
              <p className="text-xs text-muted-foreground font-mono">#{profile.hashtag_code}</p>
            )}
            {profile?.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 rounded-xl text-xs h-10" onClick={handleRemoveFriend}>
            <UserMinus className="h-3.5 w-3.5 mr-1" /> Entfernen
          </Button>
          <Button variant="destructive" className="flex-1 rounded-xl text-xs h-10" onClick={handleBlock}>
            <Ban className="h-3.5 w-3.5 mr-1" /> Blockieren
          </Button>
        </div>

        {/* Social Links */}
        {socialPlatforms.some(p => (profile as any)?.[p.key]) && (
          <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Social Media</p>
            </div>
            <div className="space-y-2">
              {socialPlatforms.map(p => {
                const val = (profile as any)?.[p.key];
                if (!val) return null;
                const url = p.urlBase ? `${p.urlBase}${val.replace("@", "")}` : val;
                return (
                  <a key={p.key} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-secondary hover:bg-accent transition-colors">
                    <span className="text-sm text-foreground">{p.label}</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="text-xs">{val}</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendProfile;
