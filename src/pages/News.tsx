import { useState, useRef } from "react";
import { Bell, Trophy, CheckSquare, Calendar, Users, Image, Trash2, Heart } from "lucide-react";
import { useActivities } from "@/hooks/use-activities";
import { usePosts, useDeletePost } from "@/hooks/use-posts";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const activityIconMap: Record<string, any> = {
  todo: CheckSquare,
  challenge: Trophy,
  event: Calendar,
  member: Users,
  default: Bell,
};

const News = () => {
  const { user } = useAuth();
  const { data: activities = [], isLoading: activitiesLoading } = useActivities();
  const { data: posts = [], isLoading: postsLoading } = usePosts();
  const deletePost = useDeletePost();

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
            <TabsTrigger value="activity" className="flex-1 rounded-lg text-xs">Aktivitäten</TabsTrigger>
          </TabsList>

          {/* FEED TAB */}
          <TabsContent value="feed" className="mt-4 space-y-4">
            {postsLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-secondary animate-pulse" />)
            ) : posts.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Image className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Noch keine Beiträge</p>
                <p className="text-xs text-muted-foreground">Hake eine Aufgabe ab und teile deinen Erfolg!</p>
              </div>
            ) : (
              (posts as any[]).map((post: any) => {
                const profile = post.profiles;
                const isOwn = post.user_id === user?.id;
                return (
                  <div key={post.id} className="bg-card rounded-2xl shadow-soft overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground">
                          {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{profile?.display_name || "Nutzer"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(post.created_at), "dd. MMM, HH:mm", { locale: de })}
                          </p>
                        </div>
                      </div>
                      {isOwn && (
                        <button
                          onClick={() => deletePost.mutate(post.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Image */}
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="w-full object-cover max-h-72"
                      />
                    )}

                    {/* Content */}
                    <div className="px-4 pb-4 pt-2 space-y-2">
                      {post.content && (
                        <p className="text-sm text-foreground">{post.content}</p>
                      )}
                      {post.tagged_user_ids?.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          👥 {post.tagged_user_ids.length} Person{post.tagged_user_ids.length > 1 ? "en" : ""} markiert
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ACTIVITY TAB */}
          <TabsContent value="activity" className="mt-4 space-y-3">
            {activitiesLoading ? (
              [1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />)
            ) : activities.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Bell className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Noch keine Aktivitäten</p>
                <p className="text-xs text-muted-foreground">Aktivitäten aus deinen Gruppen erscheinen hier</p>
              </div>
            ) : (
              (activities as any[]).map((activity: any) => {
                const Icon = activityIconMap[activity.activity_type] || activityIconMap.default;
                return (
                  <div key={activity.id} className="p-4 rounded-2xl bg-card shadow-soft flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                      )}
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

export default News;
