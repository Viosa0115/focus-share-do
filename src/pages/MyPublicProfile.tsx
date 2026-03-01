import { useNavigate } from "react-router-dom";
import { ArrowLeft, Instagram, ExternalLink } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useAura, useAuraRanking } from "@/hooks/use-aura";
import { useSavedPosts } from "@/hooks/use-saved-posts";
import { usePosts, useDeletePost } from "@/hooks/use-posts";
import { useAllPostLikes, useRespectPoints, useAllRespectForPosts } from "@/hooks/use-post-interactions";
import { useAuth } from "@/lib/auth-context";
import PostCard from "@/components/PostCard";

const socialPlatforms = [
  { key: "instagram", label: "Instagram", prefix: "@", urlBase: "https://instagram.com/" },
  { key: "tiktok", label: "TikTok", prefix: "@", urlBase: "https://tiktok.com/@" },
  { key: "pinterest", label: "Pinterest", prefix: "@", urlBase: "https://pinterest.com/" },
  { key: "spotify", label: "Spotify", prefix: "", urlBase: "" },
  { key: "snapchat", label: "Snapchat", prefix: "@", urlBase: "https://snapchat.com/add/" },
];

const MyPublicProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: aura = 0 } = useAura();
  const { data: ranking } = useAuraRanking();
  const { data: allPosts = [] } = usePosts();
  const deletePost = useDeletePost();
  const myPosts = (allPosts as any[]).filter((p: any) => p.user_id === user?.id);
  const postIds = myPosts.map((p: any) => p.id);
  const { data: allLikes = [] } = useAllPostLikes(postIds);
  const { data: allRespect = [] } = useAllRespectForPosts(postIds);
  const { data: todayRespect = [] } = useRespectPoints();
  const hasGivenRespectToday = (todayRespect as any[]).length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-foreground">Mein Profil</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">
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
            <h2 className="text-xl font-semibold text-foreground">{profile?.display_name || "—"}</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-bold text-primary">✨ {aura} Aura</span>
              {ranking && <span className="text-xs text-muted-foreground">#{ranking.rank} weltweit</span>}
            </div>
            {profile?.hashtag_code && (
              <p className="text-xs text-muted-foreground font-mono">#{profile.hashtag_code}</p>
            )}
            {profile?.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
          </div>
        </div>

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

        {/* Own posts */}
        {myPosts.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Beiträge</p>
            {myPosts.map((post: any) => {
              const likes = (allLikes as any[]).filter((l: any) => l.post_id === post.id);
              const myLike = likes.find((l: any) => l.user_id === user?.id);
              const respectCount = (allRespect as any[]).filter((r: any) => r.post_id === post.id).length;
              return (
                <PostCard key={post.id} post={post} profile={post.profiles || profile} isOwn={true}
                  likes={likes} myLike={!!myLike} respectCount={respectCount}
                  hasGivenRespectToday={hasGivenRespectToday}
                  onDelete={() => deletePost.mutate(post.id)}
                  myDisplayName={profile?.display_name || ""} />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPublicProfile;
