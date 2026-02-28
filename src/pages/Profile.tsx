import { useState } from "react";
import { LogOut, Copy, Edit2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const startEdit = () => {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setEditing(true);
  };

  const saveProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio })
      .eq("user_id", user!.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    setEditing(false);
    toast({ title: "Profil aktualisiert ✓" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Profil</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-1" /> Abmelden
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-2xl font-semibold text-secondary-foreground">
              {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
            </span>
          </div>

          {editing ? (
            <div className="w-full space-y-3">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Name"
                className="h-12 rounded-xl bg-secondary border-0 text-center text-foreground"
              />
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio (optional)"
                className="rounded-xl bg-secondary border-0 text-sm resize-none text-foreground"
                rows={3}
              />
              <Button onClick={saveProfile} className="w-full h-12 rounded-xl">
                <Check className="h-4 w-4 mr-1" /> Speichern
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {profile?.display_name || "—"}
              </h2>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              )}
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                <Edit2 className="h-3 w-3" /> Bearbeiten
              </button>
            </div>
          )}
        </div>

        {/* Hashtag Code */}
        {profile?.hashtag_code && (
          <div className="p-4 rounded-2xl bg-card shadow-soft space-y-2">
            <p className="text-xs text-muted-foreground">Dein Hashtag-Code</p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-mono font-semibold tracking-widest text-foreground">
                #{profile.hashtag_code}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(profile.hashtag_code);
                  toast({ title: "Code kopiert!" });
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Teile diesen Code, damit dich Freunde finden können
            </p>
          </div>
        )}

        {/* Email */}
        <div className="p-4 rounded-2xl bg-card shadow-soft">
          <p className="text-xs text-muted-foreground">E-Mail</p>
          <p className="text-sm text-foreground mt-1">{user?.email}</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
