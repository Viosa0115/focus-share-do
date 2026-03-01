import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, CheckSquare, Trophy, Calendar, Copy, Users, Settings, Send, Plus, Minus, Play, Square, Clock, Flag, Shield, ShieldCheck, Camera, X, Save, List, Music, Trash2, Download, Eye, UserPlus, Sparkles, Search, Crown, Pin, BarChart3, Image as ImageIcon } from "lucide-react";
import { markGroupAsSeen } from "@/hooks/use-unread-counts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGroupMessages, useSendMessage, useGroupChatMedia } from "@/hooks/use-group-chat";
import { useGroupTodos, useCreateGroupTodo, useToggleGroupTodo } from "@/hooks/use-group-todos";
import { useChallenges, useCreateChallenge, useJoinChallenge, useUpdateScore, useSaveTime, useGiveUp, useAcceptEndurance, useDeclineEndurance } from "@/hooks/use-challenges";
import { useGroupEvents, useCreateEvent, useRsvp } from "@/hooks/use-events";
import { useGroupMembers } from "@/hooks/use-group-members";
import { useGroupLists, useCreateGroupList, useDeleteGroupList } from "@/hooks/use-group-lists";
import { useFriends } from "@/hooks/use-friends";
import { useFlashbacks, useCreateFlashback, useUpdateFlashback, useFlashbackMedia, useUploadFlashbackMedia } from "@/hooks/use-flashbacks";
import { createNotification } from "@/hooks/use-notifications";
import { useGroupPolls, useCreatePoll, useVotePoll } from "@/hooks/use-polls";
import { usePinnedMessages, useTogglePin } from "@/hooks/use-pinned-messages";
import { GroupListDetail } from "@/components/GroupListDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type TabKey = "chat" | "todos" | "challenges" | "events" | "flashback" | "settings";

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: group } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: myMembership } = useQuery({
    queryKey: ["my-membership", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_members").select("*").eq("group_id", id!).eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const isAdmin = myMembership?.role === "admin";

  // Mark group messages as seen when opening group
  useEffect(() => {
    if (id && user) markGroupAsSeen(user.id, id);
  }, [id, user]);

  const tabs: { key: TabKey; label: string; icon: any; show: boolean }[] = [
    { key: "chat", label: "Chat", icon: MessageCircle, show: true },
    { key: "todos", label: "Aufgaben", icon: CheckSquare, show: group?.has_todos ?? true },
    { key: "challenges", label: "Challenges", icon: Trophy, show: group?.has_challenges ?? false },
    { key: "events", label: "Events", icon: Calendar, show: group?.has_events ?? false },
    { key: "flashback", label: "Flashback", icon: Sparkles, show: (group as any)?.has_flashbacks ?? false },
    { key: "settings", label: "Settings", icon: Settings, show: true },
  ];

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = tabParam && ["chat", "todos", "challenges", "events", "flashback", "settings"].includes(tabParam)
    ? (tabParam as TabKey)
    : "chat";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  if (!id) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/groups")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            {group?.avatar_url ? (
              <div className="h-8 w-8 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-foreground truncate">{group?.name || "..."}</h1>
              {group?.description && <p className="text-xs text-muted-foreground truncate">{group.description}</p>}
            </div>
            <button onClick={() => { navigator.clipboard.writeText(group?.join_code || ""); toast({ title: "Code kopiert!" }); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" /> {group?.join_code}
            </button>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 flex gap-1">
          {tabs.filter(t => t.show).map(({ key, icon: Icon }) => (
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
        {activeTab === "chat" && <ChatTab groupId={id} canChat={myMembership?.can_chat !== false} />}
        {activeTab === "todos" && <TodosTab groupId={id} canTodos={myMembership?.can_todos !== false} />}
        {activeTab === "challenges" && <ChallengesTab groupId={id} canChallenges={myMembership?.can_challenges !== false} />}
        {activeTab === "events" && <EventsTab groupId={id} canEvents={myMembership?.can_events !== false} />}
        {activeTab === "flashback" && <FlashbackTab groupId={id} />}
        {activeTab === "settings" && <SettingsTab groupId={id} group={group} isAdmin={isAdmin} />}
      </div>
    </div>
  );
};

/* ============ CHAT TAB ============ */
function ChatTab({ groupId, canChat }: { groupId: string; canChat: boolean }) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useGroupMessages(groupId);
  const sendMessage = useSendMessage(groupId);
  const { data: polls = [] } = useGroupPolls(groupId);
  const createPoll = useCreatePoll(groupId);
  const votePoll = useVotePoll(groupId);
  const { data: pinnedMessages = [] } = usePinnedMessages(groupId);
  const togglePin = useTogglePin(groupId);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [viewSnap, setViewSnap] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showPollCreate, setShowPollCreate] = useState(false);
  const [pollTitle, setPollTitle] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState("24");
  const [showPinned, setShowPinned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: members = [] } = useGroupMembers(groupId);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const getDisplayName = (userId: string) => {
    const member = members.find((m: any) => m.user_id === userId);
    return (member as any)?.profiles?.display_name || "Nutzer";
  };

  const isVideoUrl = (url?: string | null) => !!url && /\.(mp4|webm|mov|m4v|avi|mkv)(\?|$)/i.test(url);

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>, isSnap: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !canChat) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("chat-images").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
      const mediaLabel = file.type.startsWith("video") ? (isSnap ? "🎥 Flash" : "🎬 Video") : (isSnap ? "⚡ Flash" : "📷 Bild");
      const { error } = await supabase.from("group_messages").insert({
        group_id: groupId, user_id: user!.id,
        content: mediaLabel,
        image_url: urlData.publicUrl, is_snap: isSnap, viewed_by: [], saved_by: [],
      } as any);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleViewSnap = async (msg: any) => {
    setViewSnap(msg);
    const viewedBy = msg.viewed_by || [];
    if (!viewedBy.includes(user!.id)) {
      await supabase.from("group_messages").update({ viewed_by: [...viewedBy, user!.id] } as any).eq("id", msg.id);
      qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
    }
  };

  const handleSaveSnap = async (msg: any) => {
    const savedBy = msg.saved_by || [];
    if (!savedBy.includes(user!.id)) {
      await supabase.from("group_messages").update({ saved_by: [...savedBy, user!.id] } as any).eq("id", msg.id);
      qc.invalidateQueries({ queryKey: ["group-messages", groupId] });
    }
    if (msg.image_url) {
      const a = document.createElement("a");
      a.href = msg.image_url; a.download = "snap.jpg"; a.target = "_blank"; a.click();
    }
    toast({ title: "Gespeichert ✓" });
  };

  const isSnapViewable = (msg: any) => {
    if (!msg.is_snap) return true;
    if (msg.user_id === user?.id) return true;
    if ((msg.saved_by || []).includes(user!.id)) return true;
    if (!(msg.viewed_by || []).includes(user!.id)) return true;
    return false;
  };

  const pinnedMsgIds = new Set((pinnedMessages as any[]).map((p: any) => p.message_id));

  const handleDoubleClick = (msgId: string) => {
    togglePin.mutate(msgId);
    toast({ title: pinnedMsgIds.has(msgId) ? "Nachricht losgelöst" : "Nachricht angepinnt 📌" });
  };

  const handleCreatePoll = () => {
    const validOptions = pollOptions.filter(o => o.trim());
    if (!pollTitle.trim() || validOptions.length < 2) return;
    const endsAt = new Date(Date.now() + parseInt(pollDuration) * 3600000).toISOString();
    createPoll.mutate({ title: pollTitle, options: validOptions, ends_at: endsAt });
    setPollTitle(""); setPollOptions(["", ""]); setShowPollCreate(false);
    toast({ title: "Abstimmung erstellt! 📊" });
  };

  const filteredMessages = searchQuery
    ? (messages as any[]).filter((m: any) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex flex-col h-full">
      {/* Search, Pin, Poll bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
        <button onClick={() => setShowSearch(!showSearch)} className="text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </button>
        {showSearch && (
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Suchen..."
            className="h-8 rounded-lg bg-secondary border-0 text-xs text-foreground flex-1" autoFocus />
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {(pinnedMessages as any[]).length > 0 && (
            <button onClick={() => setShowPinned(!showPinned)} className="text-muted-foreground hover:text-foreground relative">
              <Pin className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-[7px] text-primary-foreground flex items-center justify-center">{(pinnedMessages as any[]).length}</span>
            </button>
          )}
          <button onClick={() => setShowPollCreate(!showPollCreate)} className="text-muted-foreground hover:text-foreground">
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Pinned messages drawer */}
      {showPinned && (pinnedMessages as any[]).length > 0 && (
        <div className="px-4 py-2 border-b border-border/50 bg-secondary/30 max-h-32 overflow-y-auto space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground">📌 Angepinnt</p>
          {(pinnedMessages as any[]).map((pin: any) => (
            <div key={pin.id} className="text-xs text-foreground bg-card rounded-lg px-2 py-1.5 flex items-center justify-between">
              <span className="truncate">{pin.group_messages?.content || "Nachricht"}</span>
              <button onClick={() => { togglePin.mutate(pin.message_id); }} className="text-muted-foreground hover:text-destructive ml-2 flex-shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Poll creation */}
      {showPollCreate && (
        <div className="px-4 py-3 border-b border-border/50 bg-secondary/30 space-y-2">
          <Input value={pollTitle} onChange={e => setPollTitle(e.target.value)} placeholder="Abstimmungsfrage" className="h-8 rounded-lg bg-card border-0 text-xs text-foreground" />
          {pollOptions.map((opt, i) => (
            <Input key={i} value={opt} onChange={e => { const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts); }}
              placeholder={`Option ${i + 1}`} className="h-7 rounded-lg bg-card border-0 text-xs text-foreground" />
          ))}
          <div className="flex gap-2">
            <button onClick={() => setPollOptions([...pollOptions, ""])} className="text-[10px] text-primary hover:underline">+ Option</button>
            <select value={pollDuration} onChange={e => setPollDuration(e.target.value)} className="text-[10px] bg-card rounded px-1.5 py-0.5 text-foreground">
              <option value="1">1 Stunde</option>
              <option value="6">6 Stunden</option>
              <option value="24">24 Stunden</option>
              <option value="72">3 Tage</option>
              <option value="168">7 Tage</option>
            </select>
            <button onClick={handleCreatePoll} className="ml-auto text-[10px] bg-primary text-primary-foreground px-3 py-1 rounded-lg">Erstellen</button>
          </div>
        </div>
      )}

      {/* Active polls */}
      {(polls as any[]).filter((p: any) => !p.ends_at || new Date(p.ends_at) > new Date()).length > 0 && (
        <div className="px-4 py-2 border-b border-border/50 space-y-2">
          {(polls as any[]).filter((p: any) => !p.ends_at || new Date(p.ends_at) > new Date()).map((poll: any) => {
            const options = (poll.options as string[]) || [];
            const votes = (poll.votes || {}) as Record<string, number>;
            const myVote = votes[user!.id];
            const totalVotes = Object.keys(votes).length;
            return (
              <div key={poll.id} className="p-3 rounded-xl bg-card shadow-soft space-y-2">
                <p className="text-xs font-medium text-foreground">📊 {poll.title}</p>
                {options.map((opt: string, i: number) => {
                  const voteCount = Object.values(votes).filter(v => v === i).length;
                  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                  return (
                    <button key={i} onClick={() => votePoll.mutate({ pollId: poll.id, optionIndex: i, currentVotes: votes })}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors relative overflow-hidden ${myVote === i ? "bg-primary/20 text-primary font-medium" : "bg-secondary text-foreground hover:bg-secondary/80"}`}>
                      <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${pct}%` }} />
                      <span className="relative">{opt} {totalVotes > 0 && `(${pct}%)`}</span>
                    </button>
                  );
                })}
                <p className="text-[9px] text-muted-foreground">{totalVotes} Stimmen{poll.ends_at && ` · endet ${format(new Date(poll.ends_at), "dd.MM. HH:mm")}`}</p>
              </div>
            );
          })}
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-1 w-16 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-1/2 bg-foreground/20 rounded-full animate-pulse" />
            </div>
          </div>
        ) : (filteredMessages as any[]).length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">
            {searchQuery ? "Keine Treffer" : "Noch keine Nachrichten. Starte die Konversation! 💬"}
          </p>
        ) : (
          (filteredMessages as any[]).map((msg: any) => {
            const isOwn = msg.user_id === user?.id;
            const hasImage = !!msg.image_url;
            const isSnap = msg.is_snap;
            const canView = isSnapViewable(msg);
            const wasViewed = (msg.viewed_by || []).includes(user!.id) && msg.user_id !== user?.id;

            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`} onDoubleClick={() => handleDoubleClick(msg.id)}>
                <div className={`max-w-[80%] space-y-1 ${pinnedMsgIds.has(msg.id) ? "border-l-2 border-primary pl-1" : ""}`}>
                  {!isOwn && <span className="text-[10px] font-medium text-muted-foreground ml-1">{getDisplayName(msg.user_id)}</span>}
                  {hasImage ? (
                    isSnap && !canView ? (
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                        <p className="text-xs opacity-70">⚡ Flash bereits angesehen</p>
                      </div>
                    ) : isSnap && !wasViewed && msg.user_id !== user?.id ? (
                      <button onClick={() => handleViewSnap(msg)}
                        className={`px-4 py-3 rounded-2xl flex items-center gap-2 ${isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                        <Eye className="h-4 w-4" /><span className="text-sm">Flash anzeigen</span>
                      </button>
                    ) : (
                      <div className="relative">
                        {isVideoUrl(msg.image_url) ? (
                          <video src={msg.image_url} controls className={`max-w-full rounded-2xl ${isOwn ? "rounded-br-md" : "rounded-bl-md"}`} />
                        ) : (
                          <img src={msg.image_url} alt="" className={`max-w-full rounded-2xl ${isOwn ? "rounded-br-md" : "rounded-bl-md"}`} />
                        )}
                        {isSnap && (
                          <div className="absolute top-2 right-2">
                            <button onClick={() => handleSaveSnap(msg)} className="h-7 w-7 rounded-full bg-background/70 flex items-center justify-center backdrop-blur-sm">
                              <Download className="h-3.5 w-3.5 text-foreground" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${isOwn ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
                      {msg.content}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {format(new Date(msg.created_at), "HH:mm")}
                    {isSnap && isOwn && <span className="ml-1">⚡</span>}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {viewSnap && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center" onClick={() => setViewSnap(null)}>
          {isVideoUrl(viewSnap.image_url) ? (
            <video src={viewSnap.image_url} controls className="max-w-full max-h-[70vh] rounded-2xl" />
          ) : (
            <img src={viewSnap.image_url} alt="" className="max-w-full max-h-[70vh] rounded-2xl" />
          )}
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

      {canChat ? (
        <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; sendMessage.mutate(text.trim()); setText(""); }} className="border-t border-border p-3 safe-bottom">
          <div className="max-w-lg mx-auto flex gap-2">
            <label className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-accent transition-colors flex-shrink-0">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => handleSendImage(e, true)} disabled={uploading} />
            </label>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht..." className="h-10 rounded-xl bg-secondary border-0 text-sm text-foreground" />
            <label className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center cursor-pointer hover:bg-accent transition-colors flex-shrink-0">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => handleSendImage(e, false)} disabled={uploading} />
            </label>
            <button type="submit" disabled={!text.trim()} className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 flex-shrink-0">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">Du hast keine Chat-Berechtigung</p>
        </div>
      )}
    </div>
  );
}

/* ============ TODOS TAB ============ */
function TodosTab({ groupId, canTodos }: { groupId: string; canTodos: boolean }) {
  const { user } = useAuth();
  const { data: todos = [], isLoading } = useGroupTodos(groupId);
  const createTodo = useCreateGroupTodo(groupId);
  const toggleTodo = useToggleGroupTodo(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: lists = [] } = useGroupLists(groupId);
  const createList = useCreateGroupList(groupId);
  const deleteList = useDeleteGroupList(groupId);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [title, setTitle] = useState("");
  const [todoDesc, setTodoDesc] = useState("");
  const [completionType, setCompletionType] = useState<"single" | "all">("single");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#6366f1");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const [listDesc, setListDesc] = useState("");
  const [activeList, setActiveList] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"todos" | "lists">("todos");
  const COLORS = ["#6366f1", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];

  const getDisplayName = (userId: string) => {
    const member = members.find((m: any) => m.user_id === userId);
    return (member as any)?.profiles?.display_name || "Nutzer";
  };

  if (activeList) {
    return (
      <div className="overflow-y-auto h-full px-4 py-4">
        <GroupListDetail list={activeList} onBack={() => setActiveList(null)} />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-secondary">
        <button onClick={() => setViewMode("todos")} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "todos" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}>
          Aufgaben
        </button>
        <button onClick={() => setViewMode("lists")} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "lists" ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"}`}>
          Listen
        </button>
      </div>

      {viewMode === "todos" ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Gruppenaufgaben</h3>
            {canTodos && (
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>Neue Aufgabe</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createTodo.mutate({
                      title, completionType, dueDate: dueDate || undefined, dueTime: dueTime || undefined,
                      recurrence: recurrence || undefined, description: todoDesc || undefined,
                      labelName: labelName || undefined, labelColor: labelName ? labelColor : undefined,
                      assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
                    });
                    setTitle(""); setTodoDesc(""); setDueDate(""); setDueTime(""); setRecurrence("");
                    setLabelName(""); setAssignedTo([]); setShowCreate(false);
                  }} className="space-y-4">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aufgabe..." required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                    <Textarea value={todoDesc} onChange={(e) => setTodoDesc(e.target.value)} placeholder="Beschreibung (optional)" className="rounded-xl bg-secondary border-0 text-xs text-foreground resize-none" rows={2} />
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Label (optional)</label>
                      <Input value={labelName} onChange={(e) => setLabelName(e.target.value)} placeholder="Label Name" className="h-9 rounded-xl bg-secondary border-0 text-foreground text-xs" />
                      {labelName && (
                        <div className="flex gap-1.5 flex-wrap">
                          {COLORS.map(c => (
                            <button key={c} type="button" onClick={() => setLabelColor(c)}
                              className={`h-6 w-6 rounded-full transition-transform ${labelColor === c ? "scale-125 ring-2 ring-offset-1 ring-foreground" : ""}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Zuweisen an</label>
                      <div className="flex flex-wrap gap-1.5">
                        {(members as any[]).map((m: any) => {
                          const uid = m.user_id;
                          const name = (m as any).profiles?.display_name || "Nutzer";
                          const selected = assignedTo.includes(uid);
                          return (
                            <button key={uid} type="button"
                              onClick={() => setAssignedTo(prev => selected ? prev.filter(id => id !== uid) : [...prev, uid])}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Erledigung</label>
                      <div className="flex gap-2">
                        {[{ val: "single" as const, label: "Eine Person" }, { val: "all" as const, label: "Alle Mitglieder" }].map(({ val, label }) => (
                          <button key={val} type="button" onClick={() => setCompletionType(val)}
                            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${completionType === val ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="h-10 rounded-xl bg-secondary border-0 text-foreground text-xs" />
                      <Input value={dueTime} onChange={(e) => setDueTime(e.target.value)} type="time" className="h-10 rounded-xl bg-secondary border-0 text-foreground text-xs" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Wiederholung</label>
                      <div className="flex gap-2 flex-wrap">
                        {[{ val: "", label: "Keine" }, { val: "daily", label: "Täglich" }, { val: "weekly", label: "Wöchentlich" }, { val: "monthly", label: "Monatlich" }].map(({ val, label }) => (
                          <button key={val} type="button" onClick={() => setRecurrence(val)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${recurrence === val ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl" disabled={!title.trim()}>Erstellen</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!canTodos && <p className="text-center text-xs text-muted-foreground py-4">Du hast keine Aufgaben-Berechtigung</p>}

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-secondary animate-pulse" />)}</div>
          ) : todos.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Noch keine Gruppenaufgaben</p>
          ) : (
            <div className="space-y-2">
              {todos.map((todo: any) => {
                const completions = todo.group_todo_completions || [];
                const myCompletion = completions.find((c: any) => c.user_id === user?.id);
                const totalMembers = members.length;
                const completedCount = completions.length;
                const isDone = todo.completion_type === "single" ? completedCount > 0 : completedCount >= totalMembers;

                return (
                  <div key={todo.id} className={`p-3 rounded-xl bg-card shadow-soft transition-all duration-200 ${isDone ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => canTodos && toggleTodo.mutate({ todoId: todo.id, completed: !myCompletion })} disabled={!canTodos}
                        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${myCompletion ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                        {myCompletion && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {todo.label_color && <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: todo.label_color }} />}
                          <span className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{todo.title}</span>
                        </div>
                        {todo.label_name && <span className="text-[9px] text-muted-foreground">{todo.label_name}</span>}
                        {todo.description && <p className="text-[10px] text-muted-foreground mt-0.5">{todo.description}</p>}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-[10px] text-muted-foreground">{completedCount}/{todo.completion_type === "all" ? totalMembers : 1} erledigt</p>
                          {todo.due_date && <p className="text-[10px] text-muted-foreground">📅 {format(new Date(todo.due_date), "dd.MM.")}{todo.due_time && ` ${todo.due_time.slice(0, 5)}`}</p>}
                          {todo.recurrence && <p className="text-[10px] text-muted-foreground">🔄 {todo.recurrence === "daily" ? "Täglich" : todo.recurrence === "weekly" ? "Wöchentlich" : "Monatlich"}</p>}
                        </div>
                        {(todo.assigned_to as string[] || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(todo.assigned_to as string[]).map((uid: string) => (
                              <span key={uid} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">👤 {getDisplayName(uid)}</span>
                            ))}
                          </div>
                        )}
                        {todo.completion_type === "all" && completions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {completions.map((c: any) => (
                              <span key={c.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">✓ {getDisplayName(c.user_id)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Listen</h3>
            {canTodos && (
              <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>Neue Liste</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    createList.mutate({ name: listName, description: listDesc });
                    setListName(""); setListDesc(""); setShowCreateList(false);
                  }} className="space-y-4">
                    <Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Name (z.B. Sommer)" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                    <Input value={listDesc} onChange={(e) => setListDesc(e.target.value)} placeholder="Beschreibung (optional)" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                    <Button type="submit" className="w-full h-12 rounded-xl" disabled={!listName.trim()}>Erstellen</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {(lists as any[]).length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <List className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Noch keine Listen</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(lists as any[]).map((list: any) => (
                <button key={list.id} onClick={() => setActiveList(list)}
                  className="w-full p-3 rounded-xl bg-card shadow-soft text-left hover:bg-secondary/50 transition-colors flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                    <List className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{list.name}</p>
                    {list.description && <p className="text-xs text-muted-foreground truncate">{list.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============ CHALLENGES TAB ============ */
function ChallengesTab({ groupId, canChallenges }: { groupId: string; canChallenges: boolean }) {
  const { user } = useAuth();
  const { data: challenges = [], isLoading } = useChallenges(groupId);
  const createChallenge = useCreateChallenge(groupId);
  const joinChallenge = useJoinChallenge(groupId);
  const updateScore = useUpdateScore(groupId);
  const saveTime = useSaveTime(groupId);
  const giveUp = useGiveUp(groupId);
  const acceptEndurance = useAcceptEndurance(groupId);
  const declineEndurance = useDeclineEndurance(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"count" | "time" | "endurance">("count");
  const [days, setDays] = useState("7");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [resetInterval, setResetInterval] = useState<string>("none");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState(0);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerChallengeId, setTimerChallengeId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerElapsed(Date.now() - timerStart), 10);
    return () => clearInterval(interval);
  }, [timerRunning, timerStart]);

  useEffect(() => {
    const channel = supabase.channel(`challenge-participants-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_participants" }, () => qc.invalidateQueries({ queryKey: ["challenges", groupId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId, qc]);

  const getDisplayName = (userId: string) => {
    const member = members.find((m: any) => m.user_id === userId);
    return (member as any)?.profiles?.display_name || "Nutzer";
  };

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    const frac = Math.floor((ms % 1000) / 10);
    return `${min}:${sec.toString().padStart(2, "0")}.${frac.toString().padStart(2, "0")}`;
  };

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Challenges</h3>
        {canChallenges && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Neue Challenge</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                createChallenge.mutate({
                  name, challenge_type: type,
                  start_date: new Date(startDate).toISOString(),
                  duration_days: parseInt(days),
                  reset_interval: type === "count" && resetInterval !== "none" ? resetInterval : undefined,
                });
                setName(""); setResetInterval("none"); setShowCreate(false);
              }} className="space-y-4">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name der Challenge" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Typ</label>
                  <div className="flex gap-2">
                    {([["count", "Zählen", "Zählbare Aktionen"], ["time", "Zeit", "Schnellste Zeit"], ["endurance", "Durchhalten", "Alle müssen annehmen"]] as const).map(([val, label, desc]) => (
                      <button key={val} type="button" onClick={() => setType(val)}
                        className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium transition-colors ${type === val ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        <div>{label}</div>
                        <div className={`text-[9px] mt-0.5 ${type === val ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {type === "count" && (
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Counter Reset</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {[{ val: "none", label: "Nie" }, { val: "daily", label: "Täglich" }, { val: "weekly", label: "Wöchentlich" }, { val: "monthly", label: "Monatlich" }, { val: "yearly", label: "Jährlich" }].map(({ val, label }) => (
                        <button key={val} type="button" onClick={() => setResetInterval(val)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${resetInterval === val ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <Input value={days} onChange={e => setDays(e.target.value)} type="number" min="1" max="365" placeholder="Dauer (Tage)" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim()}>Erstellen</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canChallenges && <p className="text-center text-xs text-muted-foreground py-4">Du hast keine Challenge-Berechtigung</p>}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : challenges.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Noch keine Challenges</p>
      ) : (
        <div className="space-y-4">
          {challenges.map((ch: any) => {
            const participants = ch.challenge_participants || [];
            const myPart = participants.find((p: any) => p.user_id === user?.id);
            const acceptedBy: string[] = (ch as any).accepted_by || [];
            const declinedBy: string[] = (ch as any).declined_by || [];
            const totalMembers = members.length;
            const isEndurance = ch.challenge_type === "endurance";
            const allAccepted = isEndurance && acceptedBy.length + declinedBy.length >= totalMembers;
            const myAccepted = acceptedBy.includes(user?.id || "");
            const myDeclined = declinedBy.includes(user?.id || "");
            const enduranceStarted = isEndurance && allAccepted;

            // Count challenge: find highest scorer for crown
            const countHighest = ch.challenge_type === "count" ? participants.reduce((best: any, p: any) => (!best || (p.score || 0) > (best.score || 0)) ? p : best, null) : null;

            const sorted = [...participants].sort((a: any, b: any) => {
              if (ch.challenge_type === "count") return (b.score || 0) - (a.score || 0);
              if (ch.challenge_type === "time") return (a.best_time_ms || Infinity) - (b.best_time_ms || Infinity);
              const durA = a.given_up ? new Date(a.ended_at).getTime() - new Date(a.started_at).getTime() : Date.now() - new Date(a.started_at).getTime();
              const durB = b.given_up ? new Date(b.ended_at).getTime() - new Date(b.started_at).getTime() : Date.now() - new Date(b.started_at).getTime();
              return durB - durA;
            });

            return (
              <div key={ch.id} className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm text-foreground">{ch.name}</h4>
                    <p className="text-[10px] text-muted-foreground">
                      {ch.challenge_type === "count" ? "🔢 Zählen" : ch.challenge_type === "time" ? "⏱️ Beste Zeit" : "💪 Durchhalten"} · {ch.duration_days} Tage · Start: {format(new Date(ch.start_date), "dd.MM.yyyy")}
                      {(ch as any).reset_interval && (ch as any).reset_interval !== "none" && ` · Reset: ${(ch as any).reset_interval === "daily" ? "Täglich" : (ch as any).reset_interval === "weekly" ? "Wöchentlich" : (ch as any).reset_interval === "monthly" ? "Monatlich" : "Jährlich"}`}
                    </p>
                  </div>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Endurance: acceptance phase */}
                {isEndurance && !allAccepted && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">
                      Warten auf Annahme: {acceptedBy.length}/{totalMembers - declinedBy.length} angenommen
                    </p>
                    {!myAccepted && !myDeclined && (
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 rounded-xl" onClick={() => acceptEndurance.mutate(ch.id)}>
                          ✓ Annehmen
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 rounded-xl" onClick={() => declineEndurance.mutate(ch.id)}>
                          ✗ Ablehnen
                        </Button>
                      </div>
                    )}
                    {myAccepted && <p className="text-[10px] text-primary text-center">Du hast angenommen ✓</p>}
                    {myDeclined && <p className="text-[10px] text-muted-foreground text-center">Du hast abgelehnt</p>}
                  </div>
                )}

                {/* Non-endurance or accepted endurance: normal join/play UI */}
                {(!isEndurance || enduranceStarted) && !myPart ? (
                  <Button size="sm" className="w-full rounded-xl" onClick={() => canChallenges && joinChallenge.mutate(ch.id)} disabled={!canChallenges}>Teilnehmen</Button>
                ) : (!isEndurance || enduranceStarted) && myPart ? (
                  <>
                    {ch.challenge_type === "count" && (
                      <div className="flex items-center justify-center gap-6 py-2">
                        <button onClick={() => updateScore.mutate({ challengeId: ch.id, delta: -1 })} className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center active:scale-90 transition-transform"><Minus className="h-6 w-6" /></button>
                        <span className="text-4xl font-bold text-foreground tabular-nums min-w-[60px] text-center">{myPart.score || 0}</span>
                        <button onClick={() => updateScore.mutate({ challengeId: ch.id, delta: 1 })} className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"><Plus className="h-6 w-6" /></button>
                      </div>
                    )}
                    {ch.challenge_type === "time" && (
                      <div className="text-center space-y-3 py-2">
                        <p className="text-3xl font-mono font-bold text-foreground tabular-nums">{timerChallengeId === ch.id ? formatMs(timerElapsed) : "0:00.00"}</p>
                        <div className="flex gap-2 justify-center">
                          {(!timerRunning || timerChallengeId !== ch.id) ? (
                            <Button size="sm" className="rounded-xl" onClick={() => { setTimerChallengeId(ch.id); setTimerStart(Date.now()); setTimerElapsed(0); setTimerRunning(true); }}>
                              <Play className="h-3 w-3 mr-1" /> Start
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" className="rounded-xl" onClick={() => { setTimerRunning(false); saveTime.mutate({ challengeId: ch.id, timeMs: timerElapsed }); toast({ title: "Zeit gespeichert! ⏱️" }); }}>
                                <Save className="h-3 w-3 mr-1" /> Speichern
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { setTimerRunning(false); setTimerElapsed(0); setTimerChallengeId(null); }}>
                                <X className="h-3 w-3 mr-1" /> Verwerfen
                              </Button>
                            </>
                          )}
                        </div>
                        {myPart.best_time_ms && <p className="text-xs text-muted-foreground">🏆 Beste: {formatMs(myPart.best_time_ms)}</p>}
                      </div>
                    )}
                    {ch.challenge_type === "endurance" && !myPart.given_up && (
                      <div className="text-center space-y-3 py-2">
                        <EnduranceTimer startedAt={myPart.started_at} />
                        <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => giveUp.mutate(ch.id)}>
                          <Flag className="h-3 w-3 mr-1" /> Aufgeben
                        </Button>
                      </div>
                    )}
                    {ch.challenge_type === "endurance" && myPart.given_up && (
                      <p className="text-center text-sm text-muted-foreground py-2">Aufgegeben nach {formatDuration(new Date(myPart.started_at), new Date(myPart.ended_at))}</p>
                    )}
                  </>
                ) : null}

                {sorted.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rangliste</p>
                    {sorted.map((p: any, idx: number) => {
                      const hasCrown = ch.challenge_type === "count" && countHighest && p.user_id === countHighest.user_id && (p.score || 0) > 0;
                      return (
                        <div key={p.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-secondary/50">
                          <span className="text-foreground">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`} {getDisplayName(p.user_id)}
                            {hasCrown && " 👑"}
                          </span>
                          <span className="text-muted-foreground tabular-nums font-mono">
                            {ch.challenge_type === "count" && (p.score || 0)}
                            {ch.challenge_type === "time" && (p.best_time_ms ? formatMs(p.best_time_ms) : "—")}
                            {ch.challenge_type === "endurance" && (p.given_up ? formatDuration(new Date(p.started_at), new Date(p.ended_at)) : "⏳ Läuft...")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EnduranceTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Date.now() - start);
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const s = Math.floor(elapsed / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return (
    <p className="text-3xl font-mono font-bold text-foreground tabular-nums">
      {d > 0 && <span className="text-muted-foreground text-xl">{d}d </span>}
      {h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:{sec.toString().padStart(2, "0")}
    </p>
  );
}

function formatDuration(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}T ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

/* ============ EVENTS TAB ============ */
function EventsTab({ groupId, canEvents }: { groupId: string; canEvents: boolean }) {
  const { user } = useAuth();
  const { data: events = [], isLoading } = useGroupEvents(groupId);
  const createEvent = useCreateEvent(groupId);
  const rsvp = useRsvp(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const getDisplayName = (userId: string) => {
    const member = members.find((m: any) => m.user_id === userId);
    return (member as any)?.profiles?.display_name || "Nutzer";
  };

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Events</h3>
        {canEvents && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Neues Event</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                createEvent.mutate({ name, description: desc, event_date: date, start_time: startTime, end_time: endTime });
                setName(""); setDesc(""); setDate(""); setStartTime(""); setEndTime(""); setShowCreate(false);
              }} className="space-y-3">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Beschreibung" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <Input value={date} onChange={e => setDate(e.target.value)} type="date" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <div className="flex gap-2">
                  <Input value={startTime} onChange={e => setStartTime(e.target.value)} type="time" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                  <Input value={endTime} onChange={e => setEndTime(e.target.value)} type="time" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim() || !date || !startTime || !endTime}>Erstellen</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canEvents && <p className="text-center text-xs text-muted-foreground py-4">Du hast keine Event-Berechtigung</p>}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Noch keine Events</p>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => {
            const rsvps = event.event_rsvps || [];
            const myRsvp = rsvps.find((r: any) => r.user_id === user?.id);
            const attendees = rsvps.filter((r: any) => r.status === "attending");

            return (
              <div key={event.id} className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-foreground">{event.name}</h4>
                  {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">📅 {format(new Date(event.event_date), "dd. MMM yyyy", { locale: de })} · {event.start_time?.slice(0, 5)} – {event.end_time?.slice(0, 5)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">{attendees.length} Zusagen</span>
                    {attendees.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {attendees.map((r: any) => (
                          <span key={r.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{getDisplayName(r.user_id)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={myRsvp?.status === "attending" ? "default" : "outline"} className="rounded-xl text-xs h-7"
                      onClick={() => canEvents && rsvp.mutate({ eventId: event.id, status: "attending" })} disabled={!canEvents}>Zusagen</Button>
                    <Button size="sm" variant={myRsvp?.status === "declined" ? "destructive" : "outline"} className="rounded-xl text-xs h-7"
                      onClick={() => canEvents && rsvp.mutate({ eventId: event.id, status: "declined" })} disabled={!canEvents}>Absagen</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ FLASHBACK TAB ============ */
function FlashbackTab({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { data: flashbacks = [], isLoading } = useFlashbacks(groupId);
  const createFlashback = useCreateFlashback(groupId);
  const updateFlashback = useUpdateFlashback(groupId);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [unlockTime, setUnlockTime] = useState("");
  const [activeFlashback, setActiveFlashback] = useState<any>(null);
  const [allowPhotos, setAllowPhotos] = useState(true);
  const [allowVideos, setAllowVideos] = useState(true);
  const { toast } = useToast();

  if (activeFlashback) {
    return <FlashbackDetail flashback={activeFlashback} onBack={() => setActiveFlashback(null)} />;
  }

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Flashbacks</h3>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Neuer Flashback</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const unlockAt = new Date(`${unlockDate}T${unlockTime || "00:00"}`).toISOString();
              createFlashback.mutate({ title, description: desc, unlock_at: unlockAt, allow_photos: allowPhotos, allow_videos: allowVideos });
              setTitle(""); setDesc(""); setUnlockDate(""); setUnlockTime(""); setAllowPhotos(true); setAllowVideos(true); setShowCreate(false);
              toast({ title: "Flashback erstellt! ✨" });
            }} className="space-y-4">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Beschreibung (optional)" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
              <div>
                <label className="text-xs text-muted-foreground">Öffnet sich am:</label>
                <div className="flex gap-2 mt-1">
                  <Input value={unlockDate} onChange={e => setUnlockDate(e.target.value)} type="date" required className="h-10 rounded-xl bg-secondary border-0 text-foreground text-xs" />
                  <Input value={unlockTime} onChange={e => setUnlockTime(e.target.value)} type="time" className="h-10 rounded-xl bg-secondary border-0 text-foreground text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Erlaubte Medien:</label>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">Fotos erlauben</span>
                  <Switch checked={allowPhotos} onCheckedChange={setAllowPhotos} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">Videos erlauben</span>
                  <Switch checked={allowVideos} onCheckedChange={setAllowVideos} />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={!title.trim() || !unlockDate}>Erstellen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : (flashbacks as any[]).length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Noch keine Flashbacks</p>
          <p className="text-xs text-muted-foreground">Erstelle einen Flashback mit Datum & Uhrzeit</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(flashbacks as any[]).map((fb: any) => {
            const isUnlocked = new Date(fb.unlock_at) <= new Date();
            const isCreator = fb.created_by === user?.id;

            return (
              <button key={fb.id} onClick={() => setActiveFlashback(fb)}
                className="w-full p-4 rounded-2xl bg-card shadow-soft text-left hover:bg-secondary/50 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`h-4 w-4 ${isUnlocked ? "text-primary" : "text-muted-foreground"}`} />
                    <h4 className="font-medium text-sm text-foreground">{fb.title}</h4>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isUnlocked ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {isUnlocked ? "🔓 Geöffnet" : "🔒 Gesperrt"}
                  </span>
                </div>
                {fb.description && <p className="text-xs text-muted-foreground">{fb.description}</p>}
                <p className="text-[10px] text-muted-foreground">
                  📅 Öffnet: {format(new Date(fb.unlock_at), "dd. MMM yyyy, HH:mm", { locale: de })}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FlashbackDetail({ flashback, onBack }: { flashback: any; onBack: () => void }) {
  const { user } = useAuth();
  const { data: media = [], isLoading } = useFlashbackMedia(flashback.id);
  const uploadMedia = useUploadFlashbackMedia(flashback.id);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const isUnlocked = new Date(flashback.unlock_at) <= new Date();
  const isCreator = flashback.created_by === user?.id;
  const fbAllowPhotos = (flashback as any).allow_photos !== false;
  const fbAllowVideos = (flashback as any).allow_videos !== false;
  const galleryAcceptTypes = [
    ...(fbAllowPhotos ? ["image/*"] : []),
    ...(fbAllowVideos ? ["video/*"] : []),
  ].join(",");
  const galleryUploadsAllowed = !!galleryAcceptTypes;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, source: "upload" | "camera") => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (source === "upload") {
        if (file.type.startsWith("image") && !fbAllowPhotos) {
          toast({ title: "Foto-Uploads sind für diesen Flashback deaktiviert", variant: "destructive" });
          continue;
        }
        if (file.type.startsWith("video") && !fbAllowVideos) {
          toast({ title: "Video-Uploads sind für diesen Flashback deaktiviert", variant: "destructive" });
          continue;
        }
      }
      await uploadMedia.mutateAsync(file);
    }
    setUploading(false);
    toast({ title: "Hochgeladen! 📸" });
    e.target.value = "";
  };

  const handleSaveMedia = (url: string) => {
    const a = document.createElement("a");
    a.href = url; a.download = "flashback-media"; a.target = "_blank"; a.click();
    toast({ title: "Gespeichert ✓" });
  };

  return (
    <div className="overflow-y-auto h-full">
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{flashback.title}</h3>
            {flashback.description && <p className="text-xs text-muted-foreground">{flashback.description}</p>}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isUnlocked ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {isUnlocked ? "🔓" : "🔒"}
          </span>
        </div>

        {/* Upload area - always available before unlock */}
        {!isUnlocked && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">
              Lade Fotos & Videos hoch! Sie werden erst am {format(new Date(flashback.unlock_at), "dd. MMM yyyy, HH:mm", { locale: de })} sichtbar.
            </p>
            <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:bg-secondary/30 transition-colors">
              <Camera className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {galleryUploadsAllowed
                  ? (fbAllowPhotos && fbAllowVideos ? "Fotos & Videos hochladen" : fbAllowPhotos ? "Fotos hochladen" : "Videos hochladen")
                  : "Uploads aus Galerie deaktiviert"}
              </span>
              <input type="file" accept={galleryAcceptTypes || "image/*,video/*"} multiple className="hidden" onChange={(e) => handleUpload(e, "upload")} disabled={uploading || !galleryUploadsAllowed} />
              {uploading && <div className="mt-2 h-4 w-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/30 transition-colors">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Foto mit Kamera</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, "camera")} disabled={uploading} />
              </label>
              <label className="flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/30 transition-colors">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Video mit Kamera</span>
                <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, "camera")} disabled={uploading} />
              </label>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">{(media as any[]).length} Medien hochgeladen</p>
          </div>
        )}

        {/* View media - only when unlocked */}
        {isUnlocked && (
          <>
            {(media as any[]).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Keine Medien in diesem Flashback</p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{(media as any[]).length} Medien</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(media as any[]).map((m: any, idx: number) => (
                    <button key={m.id} onClick={() => setViewerIndex(idx)}
                      className="aspect-square rounded-xl overflow-hidden bg-secondary">
                      {m.media_type === "video" ? (
                        <video src={m.media_url} className="h-full w-full object-cover" />
                      ) : (
                        <img src={m.media_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Also allow uploading more after unlock */}
                <label className="flex items-center justify-center py-4 border border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/30 transition-colors">
                  <Plus className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">{galleryUploadsAllowed ? "Mehr hochladen" : "Uploads aus Galerie deaktiviert"}</span>
                  <input type="file" accept={galleryAcceptTypes || "image/*,video/*"} multiple className="hidden" onChange={(e) => handleUpload(e, "upload")} disabled={uploading || !galleryUploadsAllowed} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/30 transition-colors">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Foto mit Kamera</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, "camera")} disabled={uploading} />
                  </label>
                  <label className="flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/30 transition-colors">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Video mit Kamera</span>
                    <input type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e, "camera")} disabled={uploading} />
                  </label>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fullscreen viewer */}
      {viewerIndex !== null && (media as any[]).length > 0 && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center"
          onClick={() => setViewerIndex(null)}>
          <div className="max-w-full max-h-[75vh] px-4" onClick={e => e.stopPropagation()}>
            {(media as any[])[viewerIndex].media_type === "video" ? (
              <video src={(media as any[])[viewerIndex].media_url} controls className="max-w-full max-h-[70vh] rounded-2xl" />
            ) : (
              <img src={(media as any[])[viewerIndex].media_url} alt="" className="max-w-full max-h-[70vh] rounded-2xl" />
            )}
          </div>
          <div className="mt-4 flex gap-3">
            {viewerIndex > 0 && (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={(e) => { e.stopPropagation(); setViewerIndex(viewerIndex - 1); }}>← Zurück</Button>
            )}
            <Button size="sm" variant="outline" className="rounded-xl" onClick={(e) => { e.stopPropagation(); handleSaveMedia((media as any[])[viewerIndex].media_url); }}>
              <Download className="h-3 w-3 mr-1" /> Speichern
            </Button>
            {viewerIndex < (media as any[]).length - 1 && (
              <Button size="sm" variant="outline" className="rounded-xl" onClick={(e) => { e.stopPropagation(); setViewerIndex(viewerIndex + 1); }}>Weiter →</Button>
            )}
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setViewerIndex(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ SETTINGS TAB ============ */
function SettingsTab({ groupId, group, isAdmin }: { groupId: string; group: any; isAdmin: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: members = [] } = useGroupMembers(groupId);
  const { data: friends = [] } = useFriends();
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [editingSpotify, setEditingSpotify] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);

  const isOwner = group?.owner_id === user?.id;
  const myMember = members.find((m: any) => m.user_id === user?.id);
  const isSettingsAdmin = myMember?.role === "admin";

  const memberUserIds = new Set(members.map((m: any) => m.user_id));
  const acceptedFriends = (friends as any[]).filter((f: any) => f.status === "accepted");
  const addableFriends = acceptedFriends.filter((f: any) => !memberUserIds.has(f.friend_id));

  const startEdit = () => { setEditName(group?.name || ""); setEditDesc(group?.description || ""); setEditing(true); };

  const saveGroupInfo = async () => {
    const { error } = await supabase.from("groups").update({ name: editName, description: editDesc }).eq("id", groupId);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["group", groupId] });
    qc.invalidateQueries({ queryKey: ["groups"] });
    setEditing(false);
    toast({ title: "Gespeichert ✓" });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `groups/${groupId}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadErr) { toast({ title: "Upload fehlgeschlagen", variant: "destructive" }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("groups").update({ avatar_url: urlData.publicUrl }).eq("id", groupId);
    qc.invalidateQueries({ queryKey: ["group", groupId] });
    setUploading(false);
    toast({ title: "Gruppenbild aktualisiert ✓" });
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    const { error } = await supabase.from("group_members").update({ role }).eq("id", memberId);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["group-members", groupId] });
    toast({ title: "Rolle aktualisiert ✓" });
  };

  const updateMemberPermission = async (memberId: string, field: string, value: boolean) => {
    const { error } = await supabase.from("group_members").update({ [field]: value }).eq("id", memberId);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["group-members", groupId] });
  };

  const addFriendToGroup = async (friendUserId: string) => {
    const { count } = await supabase.from("group_members").select("*", { count: "exact", head: true }).eq("group_id", groupId);
    if (count !== null && count >= (group?.max_members || 15)) {
      toast({ title: "Gruppe ist voll", variant: "destructive" }); return;
    }
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: friendUserId, role: "member" });
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["group-members", groupId] });
    toast({ title: "Freund hinzugefügt! ✓" });
    createNotification({
      user_id: friendUserId, type: "group_added", title: "Zur Gruppe hinzugefügt 👥",
      body: `Du wurdest zu "${group?.name}" hinzugefügt`,
      from_user_id: user!.id, group_id: groupId, group_name: group?.name || "",
    });
    setShowAddFriend(false);
  };

  const leaveGroup = async () => {
    if (!confirm("Möchtest du die Gruppe wirklich verlassen?")) return;
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user!.id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gruppe verlassen" }); navigate("/groups");
  };

  const deleteGroup = async () => {
    if (!confirm("Möchtest du die Gruppe wirklich löschen?")) return;
    await supabase.from("group_members").delete().eq("group_id", groupId);
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gruppe gelöscht" }); navigate("/groups");
  };

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-6">
      {isSettingsAdmin && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Gruppeninfo</h3>
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer">
              <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
                {group?.avatar_url ? <img src={group.avatar_url} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              {uploading && <div className="absolute inset-0 bg-background/50 rounded-2xl flex items-center justify-center"><div className="h-4 w-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>}
            </label>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-10 rounded-xl bg-secondary border-0 text-foreground" />
                  <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Beschreibung" className="h-10 rounded-xl bg-secondary border-0 text-foreground" />
                  <Button size="sm" onClick={saveGroupInfo} className="rounded-xl text-xs h-8">Speichern</Button>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-sm text-foreground">{group?.name}</p>
                  <p className="text-xs text-muted-foreground">{group?.description || "Keine Beschreibung"}</p>
                  <button onClick={startEdit} className="text-xs text-muted-foreground hover:text-foreground mt-1">Bearbeiten</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Friend to Group - Admin only */}
      {isSettingsAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Freunde hinzufügen</h3>
            <Dialog open={showAddFriend} onOpenChange={setShowAddFriend}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                  <UserPlus className="h-3 w-3 mr-1" /> Hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader><DialogTitle>Freund zur Gruppe hinzufügen</DialogTitle></DialogHeader>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {addableFriends.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Keine Freunde zum Hinzufügen verfügbar</p>
                  ) : (
                    addableFriends.map((f: any) => {
                      const profile = f.friend_profile;
                      return (
                        <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
                          <div className="h-8 w-8 rounded-full bg-card flex items-center justify-center overflow-hidden">
                            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (
                              <span className="text-xs font-medium text-foreground">{profile?.display_name?.charAt(0)?.toUpperCase() || "?"}</span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-foreground flex-1">{profile?.display_name || "Unbekannt"}</span>
                          <Button size="sm" className="rounded-xl text-xs h-7" onClick={() => addFriendToGroup(f.friend_id)}>
                            <Plus className="h-3 w-3 mr-1" /> Hinzufügen
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Members & Permissions */}
      {isSettingsAdmin && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Mitglieder & Berechtigungen</h3>
          <div className="space-y-3">
            {members.map((member: any) => {
              const isCurrentUser = member.user_id === user?.id;
              const memberName = member.profiles?.display_name || "Nutzer";
              const memberIsAdmin = member.role === "admin";

              return (
                <div key={member.id} className="p-3 rounded-xl bg-card shadow-soft space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground">
                        {memberName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{memberName}</p>
                        <div className="flex items-center gap-1">
                          {memberIsAdmin ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5"><ShieldCheck className="h-2.5 w-2.5" /> Admin</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Mitglied</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isCurrentUser && !memberIsAdmin && (
                      <Button size="sm" variant="outline" className="rounded-xl text-xs h-7" onClick={() => updateMemberRole(member.id, "admin")}>
                        <Shield className="h-3 w-3 mr-1" /> Admin
                      </Button>
                    )}
                    {!isCurrentUser && memberIsAdmin && member.user_id !== group?.owner_id && (
                      <Button size="sm" variant="outline" className="rounded-xl text-xs h-7" onClick={() => updateMemberRole(member.id, "member")}>Admin entfernen</Button>
                    )}
                  </div>
                  {!memberIsAdmin && !isCurrentUser && (
                    <div className="space-y-1.5 pt-2 border-t border-border">
                      {[{ key: "can_chat", label: "Chat" }, { key: "can_todos", label: "Aufgaben" }, { key: "can_challenges", label: "Challenges" }, { key: "can_events", label: "Events" }].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-foreground">{label}</span>
                          <Switch checked={member[key] !== false} onCheckedChange={(val) => updateMemberPermission(member.id, key, val)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Toggles */}
      {isSettingsAdmin && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Features aktivieren/deaktivieren</h3>
          <div className="space-y-2">
            {[
              { key: "has_todos", label: "Aufgaben" },
              { key: "has_challenges", label: "Challenges" },
              { key: "has_events", label: "Events" },
              { key: "has_flashbacks", label: "Flashbacks" },
              { key: "auto_delete_messages", label: "Selbstlöschende Nachrichten (24h)" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-card shadow-soft">
                <span className="text-xs text-foreground">{label}</span>
                <Switch checked={(group as any)?.[key] ?? false} onCheckedChange={async (val) => {
                  await supabase.from("groups").update({ [key]: val } as any).eq("id", groupId);
                  qc.invalidateQueries({ queryKey: ["group", groupId] });
                  toast({ title: `${label} ${val ? "aktiviert" : "deaktiviert"} ✓` });
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spotify Playlist */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Spotify Playlist</h3>
        </div>
        {editingSpotify ? (
          <div className="space-y-2">
            <Input value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)} placeholder="Spotify Playlist URL" className="h-10 rounded-xl bg-secondary border-0 text-foreground text-xs" />
            <Button size="sm" className="rounded-xl text-xs h-8" onClick={async () => {
              await supabase.from("groups").update({ spotify_playlist_url: spotifyUrl } as any).eq("id", groupId);
              qc.invalidateQueries({ queryKey: ["group", groupId] });
              setEditingSpotify(false);
              toast({ title: "Playlist gespeichert ✓" });
            }}>Speichern</Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {(group as any)?.spotify_playlist_url ? (
              <a href={(group as any).spotify_playlist_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline truncate max-w-[200px]">🎵 Playlist öffnen</a>
            ) : (
              <p className="text-xs text-muted-foreground">Keine Playlist verlinkt</p>
            )}
            {isSettingsAdmin && (
              <button onClick={() => { setSpotifyUrl((group as any)?.spotify_playlist_url || ""); setEditingSpotify(true); }} className="text-xs text-muted-foreground hover:text-foreground">Bearbeiten</button>
            )}
          </div>
        )}
      </div>

      {/* Media Gallery */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Medien</h3>
        </div>
        <MediaGallery groupId={groupId} />
      </div>

      {/* Pinned Messages in Settings */}
      <PinnedMessagesSettings groupId={groupId} />

      {/* Danger zone */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-destructive">Gefahrenzone</h3>
        <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={leaveGroup}>Gruppe verlassen</Button>
        {isOwner && <Button variant="destructive" className="w-full rounded-xl" onClick={deleteGroup}>Gruppe löschen</Button>}
      </div>
    </div>
  );
}

/* ============ MEDIA GALLERY ============ */
function MediaGallery({ groupId }: { groupId: string }) {
  const { data: media = [] } = useGroupChatMedia(groupId);
  const [viewIdx, setViewIdx] = useState<number | null>(null);
  const { toast } = useToast();
  const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

  if ((media as any[]).length === 0) return <p className="text-xs text-muted-foreground">Keine Medien im Chat</p>;

  return (
    <>
      <div className="grid grid-cols-4 gap-1.5">
        {(media as any[]).slice(0, 40).map((m: any, i: number) => (
          <button key={m.id} onClick={() => setViewIdx(i)} className="aspect-square rounded-lg overflow-hidden bg-secondary">
            {isVideo(m.image_url) ? (
              <video src={m.image_url} className="h-full w-full object-cover" />
            ) : (
              <img src={m.image_url} alt="" className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>
      {viewIdx !== null && (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center" onClick={() => setViewIdx(null)}>
          <div onClick={e => e.stopPropagation()} className="max-w-full max-h-[80vh] px-4">
            {isVideo((media as any[])[viewIdx].image_url) ? (
              <video src={(media as any[])[viewIdx].image_url} controls className="max-w-full max-h-[75vh]" />
            ) : (
              <img src={(media as any[])[viewIdx].image_url} alt="" className="max-w-full max-h-[75vh]" />
            )}
          </div>
          <button onClick={() => setViewIdx(null)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="h-4 w-4 text-foreground" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); const a = document.createElement("a"); a.href = (media as any[])[viewIdx].image_url; a.download = "media"; a.target = "_blank"; a.click(); toast({ title: "Gespeichert ✓" }); }}
            className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
            <Download className="h-4 w-4 text-foreground" />
          </button>
        </div>
      )}
    </>
  );
}

/* ============ PINNED MESSAGES IN SETTINGS ============ */
function PinnedMessagesSettings({ groupId }: { groupId: string }) {
  const { data: pinnedMessages = [] } = usePinnedMessages(groupId);
  const togglePin = useTogglePin(groupId);

  if ((pinnedMessages as any[]).length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Pin className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Angepinnte Nachrichten ({(pinnedMessages as any[]).length})</h3>
      </div>
      <div className="space-y-1.5">
        {(pinnedMessages as any[]).map((pin: any) => (
          <div key={pin.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card shadow-soft">
            <span className="text-xs text-foreground truncate flex-1">{pin.group_messages?.content || "Nachricht"}</span>
            <button onClick={() => togglePin.mutate(pin.message_id)} className="text-muted-foreground hover:text-destructive ml-2">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GroupDetail;
