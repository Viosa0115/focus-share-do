import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Check, X, Users as UsersIcon, MessageCircle } from "lucide-react";
import { useFriends, useFriendRequests, useSendFriendRequest, useRespondFriendRequest } from "@/hooks/use-friends";
import { useAllChatStreaks } from "@/hooks/use-chat-streaks";
import { useFriendLastMessages, useUnreadDMCountPerFriend } from "@/hooks/use-friend-last-messages";
import { StreakBadge } from "@/components/StreakBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { format, isToday, isYesterday } from "date-fns";
import { de } from "date-fns/locale";

const Friends = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: friends = [] } = useFriends();
  const { data: requests = [] } = useFriendRequests();
  const { data: allStreaks = [] } = useAllChatStreaks();
  const sendRequest = useSendFriendRequest();
  const respondRequest = useRespondFriendRequest();
  const [showAdd, setShowAdd] = useState(false);
  const [hashtag, setHashtag] = useState("");

  const acceptedFriends = (friends as any[]).filter((f: any) => f.status === "accepted");
  const friendshipIds = acceptedFriends.map((f: any) => f.id);
  const { data: lastMessages = {} } = useFriendLastMessages(friendshipIds);
  const { data: unreadCounts = {} } = useUnreadDMCountPerFriend(friendshipIds);

  // Sort by last message time (most recent first)
  const sortedFriends = [...acceptedFriends].sort((a: any, b: any) => {
    const aMsg = (lastMessages as any)[a.id];
    const bMsg = (lastMessages as any)[b.id];
    const aTime = aMsg ? new Date(aMsg.created_at).getTime() : 0;
    const bTime = bMsg ? new Date(bMsg.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Gestern";
    return format(d, "dd.MM.", { locale: de });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendRequest.mutateAsync(hashtag.replace("#", ""));
      toast({ title: "Anfrage gesendet! 📨" });
      setHashtag("");
      setShowAdd(false);
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Freunde</h1>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl text-xs">
                <UserPlus className="h-4 w-4 mr-1" /> Hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Freund hinzufügen</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <Input
                  value={hashtag}
                  onChange={(e) => setHashtag(e.target.value)}
                  placeholder="Hashtag-Code eingeben (8 Zeichen)"
                  maxLength={9}
                  className="h-12 rounded-xl bg-secondary border-0 text-center text-lg tracking-widest font-mono text-foreground"
                />
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl"
                  disabled={hashtag.replace("#", "").length !== 8 || sendRequest.isPending}
                >
                  {sendRequest.isPending ? "Sendet..." : "Anfrage senden"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Friend Requests */}
        {(requests as any[]).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Anfragen ({(requests as any[]).length})
            </h3>
            {(requests as any[]).map((req: any) => {
              const profile = req.requester_profile;
              return (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-card shadow-soft">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-medium text-secondary-foreground">
                      {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{profile?.display_name || "Unbekannt"}</p>
                    <p className="text-[10px] text-muted-foreground">#{profile?.hashtag_code}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondRequest.mutate({ id: req.id, accept: true })}
                      className="h-8 w-8 rounded-full bg-success flex items-center justify-center text-success-foreground"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => respondRequest.mutate({ id: req.id, accept: false })}
                      className="h-8 w-8 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Friends list */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Freunde ({acceptedFriends.length})
          </h3>
          {acceptedFriends.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Noch keine Freunde</p>
              <p className="text-xs text-muted-foreground">Füge Freunde über ihren Hashtag-Code hinzu</p>
            </div>
          ) : (
            sortedFriends.map((f: any) => {
              const profile = f.friend_profile;
              const lastMsg = (lastMessages as any)[f.id];
              const unread = (unreadCounts as any)[f.id] || 0;
              const streak = (allStreaks as any[]).find((s: any) => s.friendship_id === f.id);

              return (
                <button
                  key={f.id}
                  onClick={() => navigate(`/friends/${f.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card shadow-soft hover:bg-secondary/50 transition-colors text-left"
                >
                  <div
                    onClick={(e) => { e.stopPropagation(); navigate(`/friends/${f.id}/profile`); }}
                    className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium text-secondary-foreground">
                        {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">{profile?.display_name || "Unbekannt"}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {streak?.current_streak > 0 && <StreakBadge streak={streak.current_streak} size="sm" />}
                        {lastMsg && (
                          <span className="text-[10px] text-muted-foreground">{formatTime(lastMsg.created_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {lastMsg ? lastMsg.content : "Noch keine Nachrichten"}
                      </p>
                      {unread > 0 && (
                        <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Friends;
