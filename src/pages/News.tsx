import { useState } from "react";
import { Bell, Trophy, CheckSquare, Calendar, Users, Image, Trash2, Heart, MessageCircle, Award, Send, ChevronRight, CheckCheck, Sparkles } from "lucide-react";
import { useActivities } from "@/hooks/use-activities";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useUnreadNotificationCount, createNotification } from "@/hooks/use-notifications";
import { usePosts, useDeletePost } from "@/hooks/use-posts";
import { useAllPostLikes, useToggleLike, usePostComments, useAddComment, useRespectPoints, useGiveRespect, useAllRespectForPosts } from "@/hooks/use-post-interactions";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const iconMap: Record<string, any> = {
  like: Heart, comment: MessageCircle, respect: Award,
  new_todo: CheckSquare, todo: CheckSquare,
  new_challenge: Trophy, challenge: Trophy,
  new_event: Calendar, event: Calendar,
  new_flashback: Sparkles, group_added: Users,
  member: Users, default: Bell,
};
const colorMap: Record<string, string> = {
  like: "text-destructive", comment: "text-blue-500", respect: "text-amber-500",
  new_todo: "text-emerald-500", todo: "text-emerald-500",
  new_challenge: "text-amber-500", challenge: "text-amber-500",
  new_event: "text-blue-500", event: "text-blue-500",
  new_flashback: "text-violet-500", group_added: "text-primary",
  member: "text-violet-500", default: "text-muted-foreground",
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

  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-name", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const postIds = (posts as any[]).map((p: any) => p.id);
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
    if (item.group_id) navigate(`/groups/${item.group_id}`);
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
            ) : (posts as any[]).length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Image className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Noch keine Beiträge</p>
                <p className="text-xs text-muted-foreground">Hake eine Aufgabe ab und teile deinen Erfolg!</p>
              </div>
            ) : (
              (posts as any[]).map((post: any) => {
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
            {(unreadCount as number) > 0 && (
              <button onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs text-primary hover:underline ml-auto">
                <CheckCheck className="h-3 w-3" /> Alle gelesen
              </button>
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
                      {item.body && <p className="text-xs text-muted-foreground mt-0.5">{item.body}</p>}
                      {item.group_name && <p className="text-[10px] text-primary mt-0.5">📁 {item.group_name}</p>}
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

function PostCard({ post, profile, isOwn, likes, myLike, respectCount, hasGivenRespectToday, onDelete, myDisplayName }: {
  post: any; profile: any; isOwn: boolean; likes: any[]; myLike: boolean; respectCount: number;
  hasGivenRespectToday: boolean; onDelete: () => void; myDisplayName: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const toggleLike = useToggleLike();
  const giveRespect = useGiveRespect();
  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const { data: comments = [] } = usePostComments(post.id);
  const addComment = useAddComment();
  const [commentText, setCommentText] = useState("");

  const handleLike = () => {
    toggleLike.mutate({ postId: post.id, liked: myLike });
    if (!myLike && post.user_id !== user?.id) {
      createNotification({
        user_id: post.user_id, type: "like", title: "Neuer Like ❤️",
        body: `${myDisplayName} hat deinen Beitrag geliked`,
        from_user_id: user!.id, from_user_name: myDisplayName,
        reference_type: "post", reference_id: post.id,
      });
    }
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate({ postId: post.id, content: commentText.trim() });
    if (post.user_id !== user?.id) {
      createNotification({
        user_id: post.user_id, type: "comment", title: "Neuer Kommentar 💬",
        body: `${myDisplayName}: ${commentText.trim().substring(0, 50)}`,
        from_user_id: user!.id, from_user_name: myDisplayName,
        reference_type: "post", reference_id: post.id,
      });
    }
    setCommentText("");
  };

  const handleRespect = () => {
    if (hasGivenRespectToday) { toast({ title: "Du hast heute bereits Respect vergeben 🤝", variant: "destructive" }); return; }
    if (post.user_id === user?.id) { toast({ title: "Du kannst dir nicht selbst Respect geben", variant: "destructive" }); return; }
    giveRespect.mutate({ postId: post.id, toUserId: post.user_id });
    createNotification({
      user_id: post.user_id, type: "respect", title: "Respect erhalten! 🫡",
      body: `${myDisplayName} hat dir Respect gegeben`,
      from_user_id: user!.id, from_user_name: myDisplayName,
      reference_type: "post", reference_id: post.id,
    });
    toast({ title: "Respect vergeben! 🫡" });
  };

  return (
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground overflow-hidden">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{profile?.display_name || "Nutzer"}</p>
            <p className="text-[10px] text-muted-foreground">{format(new Date(post.created_at), "dd. MMM, HH:mm", { locale: de })}</p>
          </div>
        </div>
        {isOwn && (
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {post.image_url && <img src={post.image_url} alt="Post" className="w-full object-cover max-h-72" />}

      <div className="px-4 pb-2 pt-2 space-y-2">
        {post.content && <p className="text-sm text-foreground whitespace-pre-line">{post.content}</p>}
        {post.tagged_user_ids?.length > 0 && <p className="text-xs text-muted-foreground">👥 {post.tagged_user_ids.length} markiert</p>}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-4 pb-3 pt-1 border-t border-border/50">
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${myLike ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-secondary"}`}>
          <button onClick={handleLike}><Heart className={`h-4 w-4 ${myLike ? "fill-current" : ""}`} /></button>
          {likes.length > 0 && <button onClick={() => setShowLikers(!showLikers)} className="hover:underline">{likes.length}</button>}
        </div>
        <button onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${showComments ? "text-foreground bg-secondary" : "text-muted-foreground hover:bg-secondary"}`}>
          <MessageCircle className="h-4 w-4" />
          {(comments as any[]).length > 0 && <span>{(comments as any[]).length}</span>}
        </button>
        <button onClick={handleRespect}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${hasGivenRespectToday || post.user_id === user?.id ? "text-muted-foreground/40" : "text-muted-foreground hover:bg-secondary"}`}
          disabled={hasGivenRespectToday || post.user_id === user?.id}>
          <Award className="h-4 w-4" />
          {respectCount > 0 && <span>{respectCount}</span>}
        </button>
      </div>

      {/* Likers list */}
      {showLikers && likes.length > 0 && (
        <div className="px-4 pb-3 border-t border-border/50 pt-2">
          <p className="text-[10px] text-muted-foreground mb-1.5">Gefällt:</p>
          <div className="flex flex-wrap gap-1.5">
            {likes.map((l: any) => (
              <div key={l.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-xs">
                <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {l.profiles?.avatar_url ? (
                    <img src={l.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[7px] font-medium text-foreground">{(l.profiles?.display_name || "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="text-foreground">{l.profiles?.display_name || "Nutzer"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-2">
          {(comments as any[]).map((c: any) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-semibold text-secondary-foreground flex-shrink-0 mt-0.5 overflow-hidden">
                {c.profiles?.avatar_url ? (
                  <img src={c.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (c.profiles?.display_name || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <span className="text-xs font-medium text-foreground">{c.profiles?.display_name || "Nutzer"}</span>
                <p className="text-xs text-foreground">{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={handleComment} className="flex gap-2">
            <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Kommentar..."
              className="h-8 rounded-lg bg-secondary border-0 text-xs text-foreground flex-1" />
            <button type="submit" disabled={!commentText.trim()}
              className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default News;
