import { useState } from "react";
import { Bell, Trophy, CheckSquare, Calendar, Users, Image, Trash2, Heart, MessageCircle, Award, Send, ChevronRight, CheckCheck, Sparkles, Settings, UserCheck } from "lucide-react";
import { useActivities } from "@/hooks/use-activities";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadNotificationCount, createNotification } from "@/hooks/use-notifications";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/use-notification-preferences";
import { usePosts, useDeletePost } from "@/hooks/use-posts";
import { useAllPostLikes, useToggleLike, usePostComments, useAddComment, useRespectPoints, useGiveRespect, useAllRespectForPosts } from "@/hooks/use-post-interactions";
import { useTodoInvitations, useRespondTodoInvitation } from "@/hooks/use-todo-invitations";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard from "@/components/PostCard";

const iconMap: Record<string, any> = {
  like: Heart, comment: MessageCircle, respect: Award,
  new_todo: CheckSquare, todo: CheckSquare,
  new_challenge: Trophy, challenge: Trophy,
  new_event: Calendar, event: Calendar,
  new_flashback: Sparkles, group_added: Users,
  member: Users, default: Bell,
};
const colorMap: Record<string, string> = {
  like: "text-destructive",
  comment: "text-primary",
  respect: "text-primary",
  new_todo: "text-primary",
  todo: "text-primary",
  new_challenge: "text-primary",
  challenge: "text-primary",
  new_event: "text-primary",
  event: "text-primary",
  new_flashback: "text-primary",
  group_added: "text-primary",
  member: "text-primary",
  default: "text-muted-foreground",
};

const News = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  const deletePost = useDeletePost();
  const { toast } = useToast();
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications();
  const { data: activities = [], isLoading: activitiesLoading } = useActivities();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifPrefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const { data: todoInvitations = [] } = useTodoInvitations();
  const respondInvitation = useRespondTodoInvitation();
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-name", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Filter expired posts
  const now = new Date();
  const activePosts = (posts as any[]).filter((p: any) => {
    if (!p.expires_at) return true;
    return new Date(p.expires_at) > now;
  });

  const postIds = activePosts.map((p: any) => p.id);
  const { data: allLikes = [] } = useAllPostLikes(postIds);
  const { data: allRespect = [] } = useAllRespectForPosts(postIds);
  const { data: todayRespect = [] } = useRespectPoints();
  const hasGivenRespectToday = (todayRespect as any[]).length > 0;

  // Merge notifications + activities for the activity tab
  const mergedItems = [
    ...(notifications as any[]).map((n: any) => ({ ...n, _source: "notification" as const })),
    ...(activities as any[]).map((a: any) => ({
      id: a.id, type: a.activity_type, title: a.title, body: a.description,
      group_id: a.group_id, group_name: "", created_at: a.created_at, read: true,
      _source: "activity" as const,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleNotificationClick = (item: any) => {
    if (item._source === "notification" && !item.read) markRead.mutate(item.id);

    const referenceType = item.reference_type || item.type;
    const tabByType: Record<string, string> = {
      new_todo: "todos", todo: "todos", group_todo: "todos",
      new_challenge: "challenges", challenge: "challenges",
      new_event: "events", event: "events",
      new_flashback: "flashback", flashback: "flashback",
    };

    if (item.group_id) {
      const tab = tabByType[referenceType];
      const params = new URLSearchParams();
      if (tab) params.set("tab", tab);
      if (item.reference_id) params.set("ref", item.reference_id);
      const query = params.toString();
      navigate(query ? `/groups/${item.group_id}?${query}` : `/groups/${item.group_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4">
          <h1 className="text-xl font-semibold text-foreground">Neuigkeiten</h1>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-5 py-4">
        <Tabs defaultValue="feed">
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="feed" className="flex-1 rounded-lg text-xs">Feed</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 rounded-lg text-xs">
              Aktivitäten
              {(unreadCount as number) > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">
                  {Math.min(unreadCount as number, 99)}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4 space-y-4">
            {postsLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-secondary animate-pulse" />)
            ) : activePosts.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Image className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Noch keine Beiträge</p>
                <p className="text-xs text-muted-foreground">Hake eine Aufgabe ab und teile deinen Erfolg!</p>
              </div>
            ) : (
              activePosts.map((post: any) => {
                const profile = post.profiles;
                const isOwn = post.user_id === user?.id;
                const likes = (allLikes as any[]).filter((l: any) => l.post_id === post.id);
                const myLike = likes.find((l: any) => l.user_id === user?.id);
                const respectCount = (allRespect as any[]).filter((r: any) => r.post_id === post.id).length;
                return (
                  <PostCard key={post.id} post={post} profile={profile} isOwn={isOwn}
                    likes={likes} myLike={!!myLike} respectCount={respectCount}
                    hasGivenRespectToday={hasGivenRespectToday}
                    onDelete={() => deletePost.mutate(post.id)}
                    myDisplayName={myProfile?.display_name || ""} />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-3">
            {/* Todo Invitations */}
            {(todoInvitations as any[]).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">📋 Todo-Einladungen</p>
                {(todoInvitations as any[]).map((inv: any) => (
                  <div key={inv.id} className="p-3 rounded-2xl bg-card shadow-soft space-y-2">
                    <p className="text-sm font-medium text-foreground">{inv.todos?.title || "Aufgabe"}</p>
                    {inv.todos?.description && <p className="text-xs text-muted-foreground">{inv.todos.description}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 rounded-xl h-8 text-xs"
                        onClick={() => respondInvitation.mutate({ invitationId: inv.id, accept: true, todo: inv.todos })}>
                        <UserCheck className="h-3 w-3 mr-1" /> Annehmen
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-xl h-8 text-xs"
                        onClick={() => respondInvitation.mutate({ invitationId: inv.id, accept: false })}>
                        Ablehnen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Notification settings toggle */}
            <div className="flex items-center justify-between">
              {(unreadCount as number) > 0 && (
                <button onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <CheckCheck className="h-3 w-3" /> Alle gelesen
                </button>
              )}
              <button onClick={() => setShowNotifSettings(!showNotifSettings)} className="ml-auto text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {showNotifSettings && notifPrefs && (
              <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
                <p className="text-xs font-semibold text-foreground">Benachrichtigungseinstellungen</p>
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
                    <Switch checked={(notifPrefs as any)?.[key] ?? true} onCheckedChange={(val) => updatePrefs.mutate({ [key]: val })} />
                  </div>
                ))}
              </div>
            )}

            {notificationsLoading && activitiesLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)
            ) : mergedItems.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Bell className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Noch keine Aktivitäten</p>
              </div>
            ) : (
              mergedItems.map((item: any) => {
                const Icon = iconMap[item.type] || iconMap.default;
                const color = colorMap[item.type] || colorMap.default;
                const isUnread = item._source === "notification" && !item.read;
                return (
                  <button key={`${item._source}-${item.id}`} onClick={() => handleNotificationClick(item)}
                    className={`w-full p-4 rounded-2xl shadow-soft flex items-start gap-3 text-left transition-colors ${
                      isUnread ? "bg-primary/5 border border-primary/10" : "bg-card"
                    }`}>
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      {item.from_user_name && (
                        <p className="text-[10px] text-primary mt-0.5">👤 von {item.from_user_name}</p>
                      )}
                      {item.body && <p className="text-xs text-muted-foreground mt-0.5">{item.body}</p>}
                      {item.group_name && (
                        <p className="text-[10px] text-primary mt-0.5">📁 {item.group_name}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(item.created_at), "dd. MMM, HH:mm", { locale: de })}
                      </p>
                    </div>
                    {item.group_id && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />}
                  </button>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default News;
