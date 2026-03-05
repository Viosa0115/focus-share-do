import { useState } from "react";
import { LogOut, Copy, Edit2, Check, Lock, Globe, Camera, Key, Trash2, AlertTriangle, CheckSquare2, Sun, Moon, Mountain, Instagram, FileText, Heart as HeartIcon, Ban, Settings, ChevronRight, Sparkles, Languages } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/hooks/use-profile";
import { useTodoCompletions } from "@/hooks/use-todo-completions";
import { useBlockedUsers, useUnblockUser } from "@/hooks/use-blocked-users";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/use-notification-preferences";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { StreakBadge } from "@/components/StreakBadge";
import { useTheme } from "@/lib/theme-context";
import { useAura, useAuraRanking, addAuraPoints } from "@/hooks/use-aura";
import { useSavedPosts } from "@/hooks/use-saved-posts";
import { usePosts, useDeletePost } from "@/hooks/use-posts";
import { useAllPostLikes, useRespectPoints, useAllRespectForPosts } from "@/hooks/use-post-interactions";
import PostCard from "@/components/PostCard";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: completions = [] } = useTodoCompletions();
  const { data: blockedUsers = [] } = useBlockedUsers();
  const unblockUser = useUnblockUser();
  const { data: notifPrefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { data: aura = 0 } = useAura();
  const { data: ranking } = useAuraRanking();
  const { data: savedPosts = [] } = useSavedPosts();
  const { data: allPosts = [] } = usePosts();
  const deletePost = useDeletePost();
  const myPosts = (allPosts as any[]).filter((p: any) => p.user_id === user?.id);
  const savedPostObjects = (savedPosts as any[]).map((sp: any) => sp.posts).filter(Boolean);
  const allDisplayPosts = [...myPosts, ...savedPostObjects.filter((sp: any) => !myPosts.find((mp: any) => mp.id === sp.id))];
  const postIds = allDisplayPosts.map((p: any) => p.id);
  const { data: allLikes = [] } = useAllPostLikes(postIds);
  const { data: allRespect = [] } = useAllRespectForPosts(postIds);
  const { data: todayRespect = [] } = useRespectPoints();
  const hasGivenRespectToday = (todayRespect as any[]).length > 0;
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuraLeaderboard, setShowAuraLeaderboard] = useState(false);

  const [editingSocial, setEditingSocial] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    instagram: "", tiktok: "", pinterest: "", spotify: "", snapchat: "",
  });

  const startEdit = () => { setDisplayName(profile?.display_name || ""); setBio(profile?.bio || ""); setEditing(true); };

  const startEditSocial = () => {
    setSocialLinks({
      instagram: (profile as any)?.instagram || "", tiktok: (profile as any)?.tiktok || "",
      pinterest: (profile as any)?.pinterest || "", spotify: (profile as any)?.spotify || "",
      snapchat: (profile as any)?.snapchat || "",
    });
    setEditingSocial(true);
  };

  const saveSocial = async () => {
    const oldLinks = { instagram: (profile as any)?.instagram || "", tiktok: (profile as any)?.tiktok || "", pinterest: (profile as any)?.pinterest || "", spotify: (profile as any)?.spotify || "", snapchat: (profile as any)?.snapchat || "" };
    let newLinkCount = 0;
    for (const key of Object.keys(socialLinks) as (keyof typeof socialLinks)[]) {
      if (socialLinks[key] && !oldLinks[key]) newLinkCount++;
    }
    const { error } = await supabase.from("profiles").update(socialLinks as any).eq("user_id", user!.id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    if (newLinkCount > 0 && user) addAuraPoints(user.id, newLinkCount * 10);
    qc.invalidateQueries({ queryKey: ["profile"] }); setEditingSocial(false);
    toast({ title: "Social Links gespeichert ✓" });
  };

  const saveProfile = async () => {
    const { error } = await supabase.from("profiles").update({ display_name: displayName, bio }).eq("user_id", user!.id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["profile"] }); setEditing(false);
    toast({ title: "Profil aktualisiert ✓" });
  };

  const togglePrivacy = async (isPrivate: boolean) => {
    setSavingPrivacy(true);
    const { error } = await supabase.from("profiles").update({ is_private: isPrivate }).eq("user_id", user!.id);
    setSavingPrivacy(false);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast({ title: isPrivate ? "Konto ist jetzt privat 🔒" : "Konto ist jetzt öffentlich 🌐" });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { toast({ title: "Upload fehlgeschlagen", description: uploadErr.message, variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user!.id);
    if (updateErr) { toast({ title: "Fehler", description: updateErr.message, variant: "destructive" }); }
    else { qc.invalidateQueries({ queryKey: ["profile"] }); toast({ title: "Profilbild aktualisiert ✓" }); }
    setUploading(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast({ title: "Fehler", description: "Passwort muss mindestens 6 Zeichen haben", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Fehler", description: "Passwörter stimmen nicht überein", variant: "destructive" }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    setNewPassword(""); setConfirmPassword(""); setShowPassword(false);
    toast({ title: "Passwort geändert ✓" });
  };

  const recurringCompletions = (completions as any[]).filter((c: any) => c.recurrence && c.recurrence !== "none");
  const oneTimeCompletions = (completions as any[]).filter((c: any) => !c.recurrence || c.recurrence === "none");
  const recurrenceLabel = (r: string) => r === "daily" ? "Täglich" : r === "weekly" ? "Wöchentlich" : r === "monthly" ? "Monatlich" : "";

  const socialPlatforms = [
    { key: "instagram", label: "Instagram", prefix: "@", urlBase: "https://instagram.com/" },
    { key: "tiktok", label: "TikTok", prefix: "@", urlBase: "https://tiktok.com/@" },
    { key: "pinterest", label: "Pinterest", prefix: "@", urlBase: "https://pinterest.com/" },
    { key: "spotify", label: "Spotify", prefix: "", urlBase: "" },
    { key: "snapchat", label: "Snapchat", prefix: "@", urlBase: "https://snapchat.com/add/" },
  ];
  const hasSocialLinks = socialPlatforms.some(p => (profile as any)?.[p.key]);

  if (showAuraLeaderboard) {
    return <AuraLeaderboard onBack={() => setShowAuraLeaderboard(false)} />;
  }

  if (showSettings) {
    return (
      <SettingsPage
        onBack={() => setShowSettings(false)}
        profile={profile}
        notifPrefs={notifPrefs}
        updatePrefs={updatePrefs}
        theme={theme}
        setTheme={setTheme}
        blockedUsers={blockedUsers}
        unblockUser={unblockUser}
        togglePrivacy={togglePrivacy}
        savingPrivacy={savingPrivacy}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        changingPassword={changingPassword}
        handlePasswordChange={handlePasswordChange}
        navigate={navigate}
        user={user}
        signOut={signOut}
        toast={toast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Profil</h1>
          <button onClick={() => setShowSettings(true)} className="text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
          </button>
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
                <span className="text-2xl font-semibold text-secondary-foreground">{profile?.display_name?.charAt(0)?.toUpperCase() || "?"}</span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="h-5 w-5 text-foreground" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            {uploading && <div className="absolute inset-0 rounded-full bg-background/50 flex items-center justify-center"><div className="h-5 w-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>}
          </label>
          {editing ? (
            <div className="w-full space-y-3">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Name" className="h-12 rounded-xl bg-secondary border-0 text-center text-foreground" />
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio (optional)" className="rounded-xl bg-secondary border-0 text-sm resize-none text-foreground" rows={3} />
              <Button onClick={saveProfile} className="w-full h-12 rounded-xl"><Check className="h-4 w-4 mr-1" /> Speichern</Button>
            </div>
          ) : (
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-foreground">{profile?.display_name || "—"}</h2>
              <button onClick={() => setShowAuraLeaderboard(true)} className="flex items-center justify-center gap-2 mx-auto">
                <span className="text-sm font-bold text-primary">✨ {aura} Aura</span>
                {ranking && <span className="text-xs text-muted-foreground">#{ranking.rank} weltweit</span>}
              </button>
              {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
              <button onClick={startEdit} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2">
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
              <span className="text-lg font-mono font-semibold tracking-widest text-foreground">#{profile.hashtag_code}</span>
              <button onClick={() => { navigator.clipboard.writeText(profile.hashtag_code); toast({ title: "Code kopiert!" }); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Teile diesen Code, damit dich Freunde finden können</p>
          </div>
        )}

        {/* Social Links */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Social Media</p>
            </div>
            <button onClick={startEditSocial} className="text-xs text-muted-foreground hover:text-foreground transition-colors"><Edit2 className="h-3 w-3" /></button>
          </div>
          {editingSocial ? (
            <div className="space-y-2">
              {socialPlatforms.map(p => (
                <div key={p.key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">{p.label}</span>
                  <Input value={(socialLinks as any)[p.key]} onChange={(e) => setSocialLinks(prev => ({ ...prev, [p.key]: e.target.value }))} placeholder={`${p.prefix}username`} className="h-8 rounded-lg bg-secondary border-0 text-xs text-foreground" />
                </div>
              ))}
              <Button size="sm" onClick={saveSocial} className="w-full rounded-xl text-xs h-8 mt-2">Speichern</Button>
            </div>
          ) : hasSocialLinks ? (
            <div className="flex flex-wrap gap-2">
              {socialPlatforms.map(p => {
                const val = (profile as any)?.[p.key];
                if (!val) return null;
                const url = p.urlBase ? `${p.urlBase}${val.replace("@", "")}` : val;
                return (
                  <a key={p.key} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors">
                    {p.label}: {val}
                  </a>
                );
              })}
            </div>
          ) : <p className="text-xs text-muted-foreground">Keine Social Links hinterlegt</p>}
        </div>

        {/* Completed Todos History */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <div className="flex items-center gap-2">
            <CheckSquare2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Erledigte Aufgaben</p>
            <span className="ml-auto text-xs text-muted-foreground">{(completions as any[]).length} gesamt</span>
          </div>
          {(completions as any[]).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Noch keine erledigten Aufgaben</p>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="w-full rounded-xl h-8">
                <TabsTrigger value="all" className="flex-1 rounded-lg text-[10px] h-7">Alle</TabsTrigger>
                <TabsTrigger value="recurring" className="flex-1 rounded-lg text-[10px] h-7">Wiederkehrend</TabsTrigger>
                <TabsTrigger value="onetime" className="flex-1 rounded-lg text-[10px] h-7">Einmalig</TabsTrigger>
              </TabsList>
              {[{ value: "all", items: completions as any[] }, { value: "recurring", items: recurringCompletions }, { value: "onetime", items: oneTimeCompletions }].map(({ value, items }) => (
                <TabsContent key={value} value={value} className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {items.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Keine Einträge</p> : items.slice(0, 50).map((c: any) => (
                    <div key={c.id} className="flex items-start gap-2 py-2 border-b border-border/30 last:border-0">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Check className="h-3 w-3 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-foreground truncate">{c.title}</span>
                          {c.recurrence && c.recurrence !== "none" && <span className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{recurrenceLabel(c.recurrence)}</span>}
                        </div>
                        {c.description && <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(c.completed_at), "dd. MMM yyyy, HH:mm", { locale: de })}</p>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        {/* Saved Posts */}
        {allDisplayPosts.length > 0 && (
          <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
            <p className="text-sm font-medium text-foreground">📌 Gespeicherte & eigene Beiträge</p>
            <div className="space-y-4">
              {allDisplayPosts.slice(0, 20).map((post: any) => {
                const postProfile = post.profiles;
                const isOwn = post.user_id === user?.id;
                const likes = (allLikes as any[]).filter((l: any) => l.post_id === post.id);
                const myLike = likes.find((l: any) => l.user_id === user?.id);
                const respectCount = (allRespect as any[]).filter((r: any) => r.post_id === post.id).length;
                return (
                  <PostCard key={post.id} post={post} profile={postProfile || profile} isOwn={isOwn}
                    likes={likes} myLike={!!myLike} respectCount={respectCount}
                    hasGivenRespectToday={hasGivenRespectToday}
                    onDelete={() => deletePost.mutate(post.id)}
                    myDisplayName={profile?.display_name || ""} />
                );
              })}
            </div>
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

/* ============ SETTINGS PAGE ============ */
function SettingsPage({ onBack, profile, notifPrefs, updatePrefs, theme, setTheme, blockedUsers, unblockUser, togglePrivacy, savingPrivacy, showPassword, setShowPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, changingPassword, handlePasswordChange, navigate, user, signOut, toast }: any) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Einstellungen</h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-5 py-6 space-y-4">
        {/* Design */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <p className="text-sm font-medium text-foreground">🎨 App Design</p>
          <div className="flex gap-2">
            {[
              { value: "light" as const, label: "Light", icon: Sun },
              { value: "dark" as const, label: "Dark", icon: Moon },
              { value: "sand" as const, label: "Sand", icon: Mountain },
              { value: "pink" as const, label: "Pink", icon: HeartIcon },
            ].map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setTheme(value)} className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-colors ${theme === value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Read Receipts */}
        {notifPrefs && (
          <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
            <p className="text-sm font-medium text-foreground">📩 Lesebestätigungen</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Andere können sehen, ob du Nachrichten gelesen hast</p>
              <Switch checked={(notifPrefs as any)?.read_receipts ?? true} onCheckedChange={(val: boolean) => updatePrefs.mutate({ read_receipts: val })} />
            </div>
          </div>
        )}

        {/* Notification settings */}
        {notifPrefs && (
          <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
            <p className="text-sm font-medium text-foreground">🔔 Benachrichtigungen</p>
            {[
              { key: "likes", label: "Likes & Respect" },
              { key: "comments", label: "Kommentare" },
              { key: "todos", label: "Aufgaben" },
              { key: "events", label: "Events" },
              { key: "challenges", label: "Challenges" },
              { key: "chat_messages", label: "Chatnachrichten" },
              { key: "flashbacks", label: "Flashbacks" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{label}</span>
                <Switch checked={(notifPrefs as any)?.[key] ?? true} onCheckedChange={(val: boolean) => updatePrefs.mutate({ [key]: val })} />
              </div>
            ))}
          </div>
        )}

        {/* Privacy */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <p className="text-sm font-medium text-foreground">🔒 Datenschutz</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.is_private ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Globe className="h-4 w-4 text-muted-foreground" />}
              <div>
                <p className="text-sm text-foreground">{profile?.is_private ? "Privates Konto" : "Öffentliches Konto"}</p>
                <p className="text-xs text-muted-foreground">{profile?.is_private ? "Nur Freunde können deine Beiträge sehen" : "Jeder kann deine Beiträge sehen"}</p>
              </div>
            </div>
            <Switch checked={profile?.is_private ?? false} onCheckedChange={togglePrivacy} disabled={savingPrivacy} />
          </div>
        </div>

        {/* Blocked Users */}
        {(blockedUsers as any[]).length > 0 && (
          <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Blockierte Nutzer</p>
            </div>
            <div className="space-y-2">
              {(blockedUsers as any[]).map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {b.profile?.avatar_url ? (
                        <img src={b.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">{(b.profile?.display_name || "?").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-sm text-foreground">{b.profile?.display_name || "Unbekannt"}</span>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-7"
                    onClick={() => unblockUser.mutate(b.blocked_id)}>
                    Entblocken
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Privacy & Terms */}
        <button onClick={() => navigate("/privacy")} className="w-full p-4 rounded-2xl bg-card shadow-soft flex items-center gap-3 text-left hover:bg-accent/50 transition-colors">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Datenschutz & Bedingungen</p>
            <p className="text-xs text-muted-foreground">Datenschutzerklärung und Nutzungsbedingungen</p>
          </div>
        </button>

        {/* Password */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">🔑 Passwort</p>
            <Dialog open={showPassword} onOpenChange={setShowPassword}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl text-xs h-8"><Key className="h-3 w-3 mr-1" /> Ändern</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>Passwort ändern</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input type="password" placeholder="Neues Passwort" value={newPassword} onChange={(e: any) => setNewPassword(e.target.value)} minLength={6} className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                  <Input type="password" placeholder="Passwort bestätigen" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                  <Button onClick={handlePasswordChange} className="w-full h-12 rounded-xl" disabled={changingPassword || !newPassword || !confirmPassword}>
                    {changingPassword ? "..." : "Passwort ändern"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Logout */}
        <Button variant="outline" className="w-full rounded-xl" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Abmelden
        </Button>

        {/* Delete Account */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3 border border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">Konto löschen</p>
          </div>
          <p className="text-xs text-muted-foreground">Dein Konto und alle zugehörigen Daten werden unwiderruflich gelöscht.</p>
          <Button variant="destructive" className="w-full rounded-xl" onClick={async () => {
            if (!confirm("Bist du sicher? Dein Konto und alle Daten werden unwiderruflich gelöscht.")) return;
            if (!confirm("Letzte Warnung: Diese Aktion kann NICHT rückgängig gemacht werden. Fortfahren?")) return;
            await supabase.from("todos").delete().eq("user_id", user!.id);
            await supabase.from("posts").delete().eq("user_id", user!.id);
            await supabase.from("profiles").delete().eq("user_id", user!.id);
            await signOut();
            toast({ title: "Konto gelöscht. Auf Wiedersehen 👋" });
          }}>
            <Trash2 className="h-4 w-4 mr-1" /> Konto unwiderruflich löschen
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

/* ============ AURA LEADERBOARD ============ */
function AuraLeaderboard({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { data: topUsers = [], isLoading } = useQuery({
    queryKey: ["aura-top-100"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, aura, is_private")
        .order("aura", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">✨ Aura</h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Explanation */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <p className="text-sm font-semibold text-foreground">Was ist Aura?</p>
          <p className="text-xs text-muted-foreground">Aura zeigt deine Aktivität in der App. Je mehr du interagierst, desto höher steigst du im globalen Ranking!</p>
          <div className="space-y-1.5 text-xs text-foreground">
            <p>💬 Nachricht senden: <span className="text-primary font-semibold">+1</span></p>
            <p>❤️ Post liken: <span className="text-primary font-semibold">+1</span></p>
            <p>💬 Post kommentieren: <span className="text-primary font-semibold">+10</span></p>
            <p>🫡 Post respektieren: <span className="text-primary font-semibold">+25</span></p>
            <p>📝 Todo posten: <span className="text-primary font-semibold">+2</span></p>
            <p>👥 Gruppe erstellen: <span className="text-primary font-semibold">+3</span></p>
            <p>📋 Gruppen-Inhalt erstellen: <span className="text-primary font-semibold">+2</span></p>
            <p>🔗 Social-Media-Link: <span className="text-primary font-semibold">+10</span></p>
            <p>🤝 Neuer Freund: <span className="text-primary font-semibold">+15</span></p>
            <p>📨 Einladungs-Registrierung: <span className="text-primary font-semibold">+50</span></p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
          <p className="text-sm font-semibold text-foreground">🏆 Top 100 Weltweit</p>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 rounded-xl bg-secondary animate-pulse" />)}</div>
          ) : (
            <div className="space-y-1.5">
              {(topUsers as any[]).map((u: any, idx: number) => {
                const isMe = u.user_id === user?.id;
                const isPublic = !u.is_private;
                return (
                  <div key={u.user_id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isMe ? "bg-primary/10" : "bg-secondary/50"}`}>
                    <span className="text-xs font-bold text-muted-foreground w-7 text-right">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </span>
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {isPublic && u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-semibold text-muted-foreground">{isPublic ? (u.display_name || "?").charAt(0).toUpperCase() : "?"}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-foreground flex-1 truncate">
                      {isPublic || isMe ? u.display_name : "Privater Nutzer"}
                    </span>
                    <span className="text-xs font-bold text-primary">✨ {u.aura}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default Profile;
