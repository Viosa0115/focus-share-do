import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, CheckSquare, Trophy, Send, Plus, Minus, Camera, Eye, Save, X, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDirectMessages, useSendDirectMessage, useDirectTodos, useCreateDirectTodo, useToggleDirectTodo, useDirectChallenges, useCreateDirectChallenge, useUpdateDirectChallengeScore } from "@/hooks/use-direct-messages";
import { useFriends } from "@/hooks/use-friends";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

type TabKey = "chat" | "todos" | "challenges";

const FriendDetail = () => {
  const { id: friendshipId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: friends = [] } = useFriends();
  const [activeTab, setActiveTab] = useState<TabKey>("chat");

  const friendship = (friends as any[]).find((f: any) => f.id === friendshipId);
  const friendProfile = friendship?.friend_profile;

  const tabs: { key: TabKey; icon: any }[] = [
    { key: "chat", icon: MessageCircle },
    { key: "todos", icon: CheckSquare },
    { key: "challenges", icon: Trophy },
  ];

  if (!friendshipId) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/friends")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate(`/friends/${friendshipId}/profile`)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground overflow-hidden">
                {friendProfile?.avatar_url ? (
                  <img src={friendProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  friendProfile?.display_name?.charAt(0)?.toUpperCase() || "?"
                )}
              </div>
              <h1 className="font-semibold text-foreground truncate">{friendProfile?.display_name || "Freund"}</h1>
            </button>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 flex gap-1">
          {tabs.map(({ key, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center py-2.5 border-b-2 transition-colors ${
                activeTab === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && <DMChatTab friendshipId={friendshipId} />}
        {activeTab === "todos" && <DMTodosTab friendshipId={friendshipId} />}
        {activeTab === "challenges" && <DMChallengesTab friendshipId={friendshipId} friendship={friendship} />}
      </div>
    </div>
  );
};

function DMChatTab({ friendshipId }: { friendshipId: string }) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useDirectMessages(friendshipId);
  const sendMessage = useSendDirectMessage(friendshipId);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewSnap, setViewSnap] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>, isSnap: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chat-images").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);

      const { error } = await supabase.from("direct_messages").insert({
        friendship_id: friendshipId,
        sender_id: user!.id,
        content: isSnap ? "📸 Snap" : "📷 Bild",
        image_url: urlData.publicUrl,
        is_snap: isSnap,
        viewed_by: [],
        saved_by: [],
      } as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["direct-messages", friendshipId] });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleViewSnap = async (msg: any) => {
    setViewSnap(msg);
    // Mark as viewed
    const viewedBy = msg.viewed_by || [];
    if (!viewedBy.includes(user!.id)) {
      await supabase.from("direct_messages").update({
        viewed_by: [...viewedBy, user!.id],
      } as any).eq("id", msg.id);
      qc.invalidateQueries({ queryKey: ["direct-messages", friendshipId] });
    }
  };

  const handleSaveSnap = async (msg: any) => {
    const savedBy = msg.saved_by || [];
    if (!savedBy.includes(user!.id)) {
      await supabase.from("direct_messages").update({
        saved_by: [...savedBy, user!.id],
      } as any).eq("id", msg.id);
      qc.invalidateQueries({ queryKey: ["direct-messages", friendshipId] });
    }
    // Download image
    if (msg.image_url) {
      const a = document.createElement("a");
      a.href = msg.image_url;
      a.download = "snap.jpg";
      a.target = "_blank";
      a.click();
    }
    toast({ title: "Gespeichert ✓" });
  };

  const isSnapViewable = (msg: any) => {
    if (!msg.is_snap) return true;
    const viewedBy = msg.viewed_by || [];
    const savedBy = msg.saved_by || [];
    // Sender can always see, others can see once or if saved
    if (msg.sender_id === user?.id) return true;
    if (savedBy.includes(user!.id)) return true;
    if (!viewedBy.includes(user!.id)) return true; // not viewed yet
    return false;
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-1 w-16 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-1/2 bg-foreground/20 rounded-full animate-pulse" />
            </div>
          </div>
        ) : (messages as any[]).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">Schreibe die erste Nachricht! 💬</p>
        ) : (
          (messages as any[]).map((msg: any) => {
            const isOwn = msg.sender_id === user?.id;
            const hasImage = !!msg.image_url;
            const isSnap = msg.is_snap;
            const canView = isSnapViewable(msg);
            const viewedBy = msg.viewed_by || [];
            const wasViewed = viewedBy.includes(user!.id) && msg.sender_id !== user?.id;

            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] space-y-1">
                  {hasImage ? (
                    isSnap && !canView ? (
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                        isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                      }`}>
                        <p className="text-xs opacity-70">📸 Snap bereits angesehen</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {isSnap && !wasViewed && msg.sender_id !== user?.id ? (
                          <button onClick={() => handleViewSnap(msg)}
                            className={`px-4 py-3 rounded-2xl flex items-center gap-2 ${
                              isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                            }`}>
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">Snap anzeigen</span>
                          </button>
                        ) : (
                          <div className="relative">
                            <img src={msg.image_url} alt="" className={`max-w-full rounded-2xl ${isOwn ? "rounded-br-md" : "rounded-bl-md"}`} />
                            {isSnap && (
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button onClick={() => handleSaveSnap(msg)}
                                  className="h-7 w-7 rounded-full bg-background/70 flex items-center justify-center backdrop-blur-sm">
                                  <Download className="h-3.5 w-3.5 text-foreground" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                      isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {format(new Date(msg.created_at), "HH:mm")}
                    {isSnap && isOwn && <span className="ml-1">📸</span>}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Snap viewer overlay */}
      {viewSnap && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center" onClick={() => setViewSnap(null)}>
          <img src={viewSnap.image_url} alt="" className="max-w-full max-h-[70vh] rounded-2xl" />
          <div className="mt-4 flex gap-3">
            <Button size="sm" variant="outline" className="rounded-xl" onClick={(e) => { e.stopPropagation(); handleSaveSnap(viewSnap); }}>
              <Download className="h-3 w-3 mr-1" /> Speichern
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setViewSnap(null)}>
              <X className="h-3 w-3 mr-1" /> Schließen
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; sendMessage.mutate(text.trim()); setText(""); }} className="border-t border-border p-3 safe-bottom">
        <div className="max-w-lg mx-auto flex gap-2">
          {/* Snap button */}
          <label className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-accent transition-colors flex-shrink-0">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSendImage(e, true)} disabled={uploading} />
          </label>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht..." className="h-10 rounded-xl bg-secondary border-0 text-sm text-foreground" />
          {/* Regular image */}
          <label className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-accent transition-colors flex-shrink-0">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSendImage(e, false)} disabled={uploading} />
          </label>
          <button type="submit" disabled={!text.trim()} className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 flex-shrink-0">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function DMTodosTab({ friendshipId }: { friendshipId: string }) {
  const { user } = useAuth();
  const { data: todos = [] } = useDirectTodos(friendshipId);
  const createTodo = useCreateDirectTodo(friendshipId);
  const toggleTodo = useToggleDirectTodo(friendshipId);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Gemeinsame Aufgaben</h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Neue Aufgabe</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createTodo.mutate({ title }); setTitle(""); setShowCreate(false); }} className="space-y-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aufgabe..." required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={!title.trim()}>Erstellen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(todos as any[]).length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Noch keine gemeinsamen Aufgaben</p>
      ) : (
        <div className="space-y-2">
          {(todos as any[]).map((todo: any) => {
            const myCompleted = (todo.completed_by || []).includes(user?.id);
            return (
              <div key={todo.id} className="p-3 rounded-xl bg-card shadow-soft">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleTodo.mutate({ todoId: todo.id, completedBy: todo.completed_by || [] })}
                    className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${myCompleted ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                    {myCompleted && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  <span className={`text-sm ${myCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{todo.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DMChallengesTab({ friendshipId, friendship }: { friendshipId: string; friendship: any }) {
  const { user } = useAuth();
  const { data: challenges = [] } = useDirectChallenges(friendshipId);
  const createChallenge = useCreateDirectChallenge(friendshipId);
  const updateScore = useUpdateDirectChallengeScore(friendshipId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"count">("count");

  const isCreator = (ch: any) => ch.created_by === user?.id;

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Challenges</h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Neue Challenge</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createChallenge.mutate({ name, challenge_type: type }); setName(""); setShowCreate(false); }} className="space-y-4">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim()}>Erstellen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(challenges as any[]).length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Noch keine Challenges</p>
      ) : (
        <div className="space-y-4">
          {(challenges as any[]).map((ch: any) => {
            const myField = isCreator(ch) ? "score_creator" : "score_friend";
            const myScore = isCreator(ch) ? (ch.score_creator || 0) : (ch.score_friend || 0);
            const theirScore = isCreator(ch) ? (ch.score_friend || 0) : (ch.score_creator || 0);

            return (
              <div key={ch.id} className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
                <h4 className="font-medium text-sm text-foreground">{ch.name}</h4>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground tabular-nums">{myScore}</p>
                    <p className="text-[10px] text-muted-foreground">Du</p>
                  </div>
                  <p className="text-sm text-muted-foreground">vs</p>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground tabular-nums">{theirScore}</p>
                    <p className="text-[10px] text-muted-foreground">{friendship?.friend_profile?.display_name || "Freund"}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => updateScore.mutate({ challengeId: ch.id, field: myField, delta: -1 })}
                    className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Minus className="h-4 w-4" />
                  </button>
                  <button onClick={() => updateScore.mutate({ challengeId: ch.id, field: myField, delta: 1 })}
                    className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FriendDetail;
