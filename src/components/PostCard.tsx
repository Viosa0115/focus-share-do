import { useState } from "react";
import { Heart, MessageCircle, Award, Send, Trash2, Reply, Bookmark } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useToggleLike, usePostComments, useAddComment, useGiveRespect } from "@/hooks/use-post-interactions";
import { useCommentReplies, useAddReply } from "@/hooks/use-comment-replies";
import { createNotification } from "@/hooks/use-notifications";
import { useExtendPostLife } from "@/hooks/use-posts";
import { useToggleSavePost, useMySavedPostIds } from "@/hooks/use-saved-posts";
import { addAuraPoints } from "@/hooks/use-aura";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface PostCardProps {
  post: any;
  profile: any;
  isOwn: boolean;
  likes: any[];
  myLike: boolean;
  respectCount: number;
  hasGivenRespectToday: boolean;
  onDelete: () => void;
  myDisplayName: string;
}

function CommentReplySection({ comment, myDisplayName, postUserId }: { comment: any; myDisplayName: string; postUserId: string }) {
  const { user } = useAuth();
  const { data: replies = [] } = useCommentReplies(comment.id);
  const addReply = useAddReply();
  const [replyText, setReplyText] = useState("");
  const [showReply, setShowReply] = useState(false);

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    addReply.mutate({ commentId: comment.id, content: replyText.trim() });
    if (comment.user_id !== user?.id) {
      createNotification({
        user_id: comment.user_id, type: "comment", title: "Antwort auf deinen Kommentar 💬",
        body: `${myDisplayName}: ${replyText.trim().substring(0, 50)}`,
        from_user_id: user!.id, from_user_name: myDisplayName,
      });
    }
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div className="ml-7 space-y-1.5">
      {(replies as any[]).map((r: any) => (
        <div key={r.id} className="flex items-start gap-1.5">
          <div className="h-4 w-4 rounded-full bg-secondary flex items-center justify-center text-[7px] font-semibold text-secondary-foreground flex-shrink-0 mt-0.5 overflow-hidden">
            {r.profiles?.avatar_url ? (
              <img src={r.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (r.profiles?.display_name || "?").charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <span className="text-[10px] font-medium text-foreground">{r.profiles?.display_name || "Nutzer"}</span>
            <p className="text-[10px] text-foreground">{r.content}</p>
          </div>
        </div>
      ))}
      <button onClick={() => setShowReply(!showReply)} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
        <Reply className="h-2.5 w-2.5" /> Antworten
      </button>
      {showReply && (
        <form onSubmit={handleReply} className="flex gap-1.5">
          <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Antwort..."
            className="h-6 rounded-md bg-secondary border-0 text-[10px] text-foreground flex-1" />
          <button type="submit" disabled={!replyText.trim()}
            className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
            <Send className="h-2.5 w-2.5" />
          </button>
        </form>
      )}
    </div>
  );
}

export default function PostCard({ post, profile, isOwn, likes, myLike, respectCount, hasGivenRespectToday, onDelete, myDisplayName }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const toggleLike = useToggleLike();
  const giveRespect = useGiveRespect();
  const extendLife = useExtendPostLife();
  const toggleSave = useToggleSavePost();
  const { data: savedIds } = useMySavedPostIds();
  const isSaved = savedIds?.has(post.id) ?? false;
  const [showComments, setShowComments] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const { data: comments = [] } = usePostComments(post.id);
  const addComment = useAddComment();
  const [commentText, setCommentText] = useState("");

  const contentLines = (post.content || "").split("\n");
  const metaLines: string[] = [];
  const thoughtLines: string[] = [];
  let pastSeparator = false;

  for (const line of contentLines) {
    if (line.startsWith("---") || line.startsWith("———")) {
      pastSeparator = true;
      continue;
    }
    if (!pastSeparator) metaLines.push(line);
    else thoughtLines.push(line);
  }

  const hasMeta = pastSeparator && metaLines.length > 0;
  const displayMeta = hasMeta ? metaLines : [];
  const displayContent = hasMeta ? thoughtLines.join("\n").trim() : post.content;

  const handleLike = () => {
    toggleLike.mutate({ postId: post.id, liked: myLike });
    if (!myLike) {
      extendLife.mutate({ postId: post.id, extraMs: 3600000 });
      if (user) addAuraPoints(user.id, 1);
      if (post.user_id !== user?.id) {
        createNotification({
          user_id: post.user_id, type: "like", title: "Neuer Like ❤️",
          body: `${myDisplayName} hat deinen Beitrag geliked`,
          from_user_id: user!.id, from_user_name: myDisplayName,
          reference_type: "post", reference_id: post.id,
        });
      }
    }
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate({ postId: post.id, content: commentText.trim() });
    if (user) addAuraPoints(user.id, 10);
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
    extendLife.mutate({ postId: post.id, extraMs: 48 * 3600000 });
    if (user) addAuraPoints(user.id, 25);
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

      {displayMeta.length > 0 && (
        <div className="px-4 py-2 bg-secondary/50 border-y border-border/30 space-y-0.5">
          {displayMeta.map((line, i) => (
            <p key={i} className="text-xs text-foreground whitespace-pre-line">{line}</p>
          ))}
        </div>
      )}

      {post.image_url && <img src={post.image_url} alt="Post" className="w-full object-cover max-h-72" />}

      <div className="px-4 pb-2 pt-2 space-y-2">
        {displayContent && <p className="text-sm text-foreground whitespace-pre-line">{displayContent}</p>}
        {post.tagged_user_ids?.length > 0 && <p className="text-xs text-muted-foreground">👥 {post.tagged_user_ids.length} markiert</p>}
      </div>

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
        <button onClick={() => toggleSave.mutate({ postId: post.id, saved: isSaved })}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ml-auto ${isSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary"}`}>
          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
        </button>
      </div>

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

      {showComments && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-2">
          {(comments as any[]).map((c: any) => (
            <div key={c.id}>
              <div className="flex items-start gap-2">
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
              <CommentReplySection comment={c} myDisplayName={myDisplayName} postUserId={post.user_id} />
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
