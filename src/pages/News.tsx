import { useState } from "react";
import { Bell, Trophy, CheckSquare, Calendar, Users, Image, Trash2, Heart, MessageCircle, Award, Send, BellOff, BellRing } from "lucide-react";
import { useActivities } from "@/hooks/use-activities";
import { usePosts, useDeletePost } from "@/hooks/use-posts";
import { useAllPostLikes, useToggleLike, usePostComments, useAddComment, useRespectPoints, useGiveRespect, useAllRespectForPosts } from "@/hooks/use-post-interactions";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const activityIconMap: Record<string, any> = {
  todo: CheckSquare,
  challenge: Trophy,
  event: Calendar,
  member: Users,
  default: Bell,
};

const activityColorMap: Record<string, string> = {
  todo: "text-emerald-500",
  challenge: "text-amber-500",
  event: "text-blue-500",
  member: "text-violet-500",
  default: "text-muted-foreground",
};

const News = () => {
  const { user } = useAuth();
  const { data: activities = [], isLoading: activitiesLoading } = useActivities();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  const deletePost = useDeletePost();
  const { toast } = useToast();

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem("notifications_enabled") === "true";
  });

  const postIds = (posts as any[]).map((p: any) => p.id);
  const { data: allLikes = [] } = useAllPostLikes(postIds);
  const { data: allRespect = [] } = useAllRespectForPosts(postIds);
  const { data: todayRespect = [] } = useRespectPoints();
  const hasGivenRespectToday = (todayRespect as any[]).length > 0;

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setNotificationsEnabled(true);
          localStorage.setItem("notifications_enabled", "true");
          toast({ title: "Push-Benachrichtigungen aktiviert 🔔" });
        } else {
          toast({ title: "Benachrichtigungen blockiert", description: "Bitte aktiviere sie in den Browser-Einstellungen.", variant: "destructive" });
        }
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem("notifications_enabled", "false");
      toast({ title: "Push-Benachrichtigungen deaktiviert 🔕" });
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
              {(activities as any[]).length > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">
                  {Math.min((activities as any[]).length, 99)}
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
                  <PostCard
                    key={post.id}
                    post={post}
                    profile={profile}
                    isOwn={isOwn}
                    likes={likes}
                    myLike={!!myLike}
                    respectCount={respectCount}
                    hasGivenRespectToday={hasGivenRespectToday}
                    onDelete={() => deletePost.mutate(post.id)}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-3">
            {/* Notification toggle */}
            <div className="p-3 rounded-xl bg-card shadow-soft flex items-center justify-between">
              <div className="flex items-center gap-2">
                {notificationsEnabled ? <BellRing className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-xs font-medium text-foreground">Push-Benachrichtigungen</p>
                  <p className="text-[10px] text-muted-foreground">{notificationsEnabled ? "Aktiviert" : "Deaktiviert"}</p>
                </div>
              </div>
              <button
                onClick={toggleNotifications}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  notificationsEnabled
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {notificationsEnabled ? "Deaktivieren" : "Aktivieren"}
              </button>
            </div>

            {activitiesLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)
            ) : (activities as any[]).length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Bell className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Noch keine Aktivitäten</p>
                <p className="text-xs text-muted-foreground">Erstelle Todos, Challenges oder Events in deinen Gruppen</p>
              </div>
            ) : (
              (activities as any[]).map((activity: any) => {
                const Icon = activityIconMap[activity.activity_type] || activityIconMap.default;
                const colorClass = activityColorMap[activity.activity_type] || activityColorMap.default;
                return (
                  <div key={activity.id} className="p-4 rounded-2xl bg-card shadow-soft flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className={`h-4 w-4 ${colorClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      {activity.description && <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(activity.created_at), "dd. MMM, HH:mm", { locale: de })}
                      </p>
                    </div>
                  </div>
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

function PostCard({ post, profile, isOwn, likes, myLike, respectCount, hasGivenRespectToday, onDelete }: {
  post: any; profile: any; isOwn: boolean; likes: any[]; myLike: boolean; respectCount: number; hasGivenRespectToday: boolean; onDelete: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const toggleLike = useToggleLike();
  const giveRespect = useGiveRespect();
  const [showComments, setShowComments] = useState(false);
  const { data: comments = [] } = usePostComments(post.id);
  const addComment = useAddComment();
  const [commentText, setCommentText] = useState("");

  const handleRespect = () => {
    if (hasGivenRespectToday) {
      toast({ title: "Du hast heute bereits Respect vergeben 🤝", variant: "destructive" });
      return;
    }
    if (post.user_id === user?.id) {
      toast({ title: "Du kannst dir nicht selbst Respect geben", variant: "destructive" });
      return;
    }
    giveRespect.mutate({ postId: post.id, toUserId: post.user_id });
    toast({ title: "Respect vergeben! 🫡" });
  };

  return (
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              profile?.display_name?.charAt(0)?.toUpperCase() || "?"
            )}
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
        {post.tagged_user_ids?.length > 0 && (
          <p className="text-xs text-muted-foreground">👥 {post.tagged_user_ids.length} markiert</p>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 px-4 pb-3 pt-1 border-t border-border/50">
        <button onClick={() => toggleLike.mutate({ postId: post.id, liked: myLike })}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${myLike ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:bg-secondary"}`}>
          <Heart className={`h-4 w-4 ${myLike ? "fill-current" : ""}`} />
          {likes.length > 0 && <span>{likes.length}</span>}
        </button>
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

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-2">
          {(comments as any[]).map((c: any) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[8px] font-semibold text-secondary-foreground flex-shrink-0 mt-0.5">
                {(c.profiles?.display_name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-medium text-foreground">{c.profiles?.display_name || "Nutzer"}</span>
                <p className="text-xs text-foreground">{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!commentText.trim()) return;
            addComment.mutate({ postId: post.id, content: commentText.trim() });
            setCommentText("");
          }} className="flex gap-2">
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
