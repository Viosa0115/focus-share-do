import { useState } from "react";
import { LogOut, Copy, Edit2, Check, Lock, Globe, Camera, Key } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

  const togglePrivacy = async (isPrivate: boolean) => {
    setSavingPrivacy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_private: isPrivate })
      .eq("user_id", user!.id);
    setSavingPrivacy(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast({ title: isPrivate ? "Konto ist jetzt privat 🔒" : "Konto ist jetzt öffentlich 🌐" });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) {
      toast({ title: "Upload fehlgeschlagen", description: uploadErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("user_id", user!.id);
    if (updateErr) {
      toast({ title: "Fehler", description: updateErr.message, variant: "destructive" });
    } else {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profilbild aktualisiert ✓" });
    }
    setUploading(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Fehler", description: "Passwort muss mindestens 6 Zeichen haben", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Fehler", description: "Passwörter stimmen nicht überein", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    toast({ title: "Passwort geändert ✓" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Profil</h1>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-1" /> Abmelden
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Avatar & Name */}
        <div className="flex flex-col items-center space-y-4">
          <label className="relative cursor-pointer group">
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-secondary-foreground">
                  {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-5 w-5 text-foreground" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-background/50 flex items-center justify-center">
                <div className="h-5 w-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </label>

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

        {/* Privacy Setting */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <p className="text-sm font-medium text-foreground">Datenschutz</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.is_private ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Globe className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm text-foreground">
                  {profile?.is_private ? "Privates Konto" : "Öffentliches Konto"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profile?.is_private
                    ? "Nur Freunde können deine Beiträge sehen"
                    : "Jeder kann deine Beiträge sehen"}
                </p>
              </div>
            </div>
            <Switch
              checked={profile?.is_private ?? false}
              onCheckedChange={togglePrivacy}
              disabled={savingPrivacy}
            />
          </div>
        </div>

        {/* Password Change */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Passwort</p>
            <Dialog open={showPassword} onOpenChange={setShowPassword}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl text-xs h-8">
                  <Key className="h-3 w-3 mr-1" /> Ändern
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>Passwort ändern</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="password"
                    placeholder="Neues Passwort"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className="h-12 rounded-xl bg-secondary border-0 text-foreground"
                  />
                  <Input
                    type="password"
                    placeholder="Passwort bestätigen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-xl bg-secondary border-0 text-foreground"
                  />
                  <Button onClick={handlePasswordChange} className="w-full h-12 rounded-xl" disabled={changingPassword || !newPassword || !confirmPassword}>
                    {changingPassword ? "..." : "Passwort ändern"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
