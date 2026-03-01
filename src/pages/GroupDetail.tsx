import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, CheckSquare, Trophy, Calendar, Copy, Users, Settings, Send, Plus, Minus, Play, Square, Clock, Flag, Shield, ShieldCheck, Camera, X, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGroupMessages, useSendMessage } from "@/hooks/use-group-chat";
import { useGroupTodos, useCreateGroupTodo, useToggleGroupTodo } from "@/hooks/use-group-todos";
import { useChallenges, useCreateChallenge, useJoinChallenge, useUpdateScore, useSaveTime, useGiveUp } from "@/hooks/use-challenges";
import { useGroupEvents, useCreateEvent, useRsvp } from "@/hooks/use-events";
import { useGroupMembers } from "@/hooks/use-group-members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type TabKey = "chat" | "todos" | "challenges" | "events" | "settings";

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: group } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: myMembership } = useQuery({
    queryKey: ["my-membership", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", id!)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const isAdmin = myMembership?.role === "admin";

  const tabs: { key: TabKey; label: string; icon: any; show: boolean }[] = [
    { key: "chat", label: "Chat", icon: MessageCircle, show: true },
    { key: "todos", label: "Aufgaben", icon: CheckSquare, show: group?.has_todos ?? true },
    { key: "challenges", label: "Challenges", icon: Trophy, show: group?.has_challenges ?? false },
    { key: "events", label: "Events", icon: Calendar, show: group?.has_events ?? false },
    { key: "settings", label: "Settings", icon: Settings, show: true },
  ];

  const [activeTab, setActiveTab] = useState<TabKey>("chat");

  if (!id) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/groups")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-foreground truncate">{group?.name || "..."}</h1>
              {group?.description && <p className="text-xs text-muted-foreground truncate">{group.description}</p>}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(group?.join_code || "");
                toast({ title: "Code kopiert!" });
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3 w-3" />
              {group?.join_code}
            </button>
          </div>
        </div>
        {/* Tab bar */}
        <div className="max-w-lg mx-auto px-4 flex gap-1">
          {tabs.filter(t => t.show).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && <ChatTab groupId={id} canChat={myMembership?.can_chat !== false} />}
        {activeTab === "todos" && <TodosTab groupId={id} canTodos={myMembership?.can_todos !== false} />}
        {activeTab === "challenges" && <ChallengesTab groupId={id} canChallenges={myMembership?.can_challenges !== false} />}
        {activeTab === "events" && <EventsTab groupId={id} canEvents={myMembership?.can_events !== false} />}
        {activeTab === "settings" && <SettingsTab groupId={id} group={group} />}
      </div>
    </div>
  );
};

/* ============ CHAT TAB ============ */
function ChatTab({ groupId, canChat }: { groupId: string; canChat: boolean }) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useGroupMessages(groupId);
  const sendMessage = useSendMessage(groupId);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: members = [] } = useGroupMembers(groupId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const getDisplayName = (userId: string) => {
    const member = members.find((m: any) => m.user_id === userId);
    return (member as any)?.profiles?.display_name || "Nutzer";
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !canChat) return;
    sendMessage.mutate(text.trim());
    setText("");
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
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">Noch keine Nachrichten. Starte die Konversation! 💬</p>
        ) : (
          messages.map((msg: any) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] space-y-1`}>
                  {!isOwn && <span className="text-[10px] font-medium text-muted-foreground ml-1">{getDisplayName(msg.user_id)}</span>}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {format(new Date(msg.created_at), "HH:mm")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      {canChat ? (
        <form onSubmit={handleSend} className="border-t border-border p-3 safe-bottom">
          <div className="max-w-lg mx-auto flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nachricht..."
              className="h-10 rounded-xl bg-secondary border-0 text-sm text-foreground"
            />
            <button type="submit" disabled={!text.trim()} className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40">
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
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [completionType, setCompletionType] = useState<"single" | "all">("single");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [recurrence, setRecurrence] = useState("");

  const getDisplayName = (userId: string) => {
    const member = members.find((m: any) => m.user_id === userId);
    return (member as any)?.profiles?.display_name || "Nutzer";
  };

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Gruppenaufgaben</h3>
        {canTodos && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                <Plus className="h-3 w-3 mr-1" /> Neu
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Neue Aufgabe</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                createTodo.mutate({ title, completionType, dueDate: dueDate || undefined, dueTime: dueTime || undefined, recurrence: recurrence || undefined });
                setTitle(""); setDueDate(""); setDueTime(""); setRecurrence("");
                setShowCreate(false);
              }} className="space-y-4">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aufgabe..." required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Erledigung</label>
                  <div className="flex gap-2">
                    {[
                      { val: "single" as const, label: "Eine Person" },
                      { val: "all" as const, label: "Alle Mitglieder" },
                    ].map(({ val, label }) => (
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
                    {[
                      { val: "", label: "Keine" },
                      { val: "daily", label: "Täglich" },
                      { val: "weekly", label: "Wöchentlich" },
                      { val: "monthly", label: "Monatlich" },
                    ].map(({ val, label }) => (
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

      {!canTodos && (
        <p className="text-center text-xs text-muted-foreground py-4">Du hast keine Aufgaben-Berechtigung</p>
      )}

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
                  <button onClick={() => canTodos && toggleTodo.mutate({ todoId: todo.id, completed: !myCompletion })}
                    disabled={!canTodos}
                    className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${myCompletion ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                    {myCompletion && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  <div className="flex-1">
                    <span className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{todo.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-muted-foreground">
                        {completedCount}/{todo.completion_type === "all" ? totalMembers : 1} erledigt
                      </p>
                      {todo.due_date && (
                        <p className="text-[10px] text-muted-foreground">
                          📅 {format(new Date(todo.due_date), "dd.MM.")}
                          {todo.due_time && ` ${todo.due_time.slice(0, 5)}`}
                        </p>
                      )}
                      {todo.recurrence && (
                        <p className="text-[10px] text-muted-foreground">
                          🔄 {todo.recurrence === "daily" ? "Täglich" : todo.recurrence === "weekly" ? "Wöchentlich" : "Monatlich"}
                        </p>
                      )}
                    </div>
                    {/* Show who completed */}
                    {todo.completion_type === "all" && completions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {completions.map((c: any) => (
                          <span key={c.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            ✓ {getDisplayName(c.user_id)}
                          </span>
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
  const { data: members = [] } = useGroupMembers(groupId);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"count" | "time" | "endurance">("count");
  const [days, setDays] = useState("7");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Timer state for time challenges
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

  // Realtime for challenge participants
  useEffect(() => {
    const channel = supabase
      .channel(`challenge-participants-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenge_participants" },
        () => qc.invalidateQueries({ queryKey: ["challenges", groupId] })
      )
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
                createChallenge.mutate({ name, challenge_type: type, start_date: new Date(startDate).toISOString(), duration_days: parseInt(days) });
                setName(""); setShowCreate(false);
              }} className="space-y-4">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name der Challenge" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Typ</label>
                  <div className="flex gap-2">
                    {([
                      ["count", "Zählen", "Zählbare Aktionen (z.B. Liegestütze)"],
                      ["time", "Zeit", "Schnellste Zeit gewinnt"],
                      ["endurance", "Durchhalten", "Wer hält am längsten durch"],
                    ] as const).map(([val, label, desc]) => (
                      <button key={val} type="button" onClick={() => setType(val)}
                        className={`flex-1 py-2 px-1 rounded-xl text-xs font-medium transition-colors ${type === val ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        <div>{label}</div>
                        <div className={`text-[9px] mt-0.5 ${type === val ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <Input value={startDate} onChange={e => setStartDate(e.target.value)} type="date" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <Input value={days} onChange={e => setDays(e.target.value)} type="number" min="1" max="365" placeholder="Dauer (Tage)" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
                <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim()}>Erstellen</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canChallenges && (
        <p className="text-center text-xs text-muted-foreground py-4">Du hast keine Challenge-Berechtigung</p>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : challenges.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Noch keine Challenges</p>
      ) : (
        <div className="space-y-4">
          {challenges.map((ch: any) => {
            const participants = ch.challenge_participants || [];
            const myPart = participants.find((p: any) => p.user_id === user?.id);
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
                    </p>
                  </div>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </div>

                {!myPart ? (
                  <Button size="sm" className="w-full rounded-xl" onClick={() => canChallenges && joinChallenge.mutate(ch.id)} disabled={!canChallenges}>
                    Teilnehmen
                  </Button>
                ) : (
                  <>
                    {/* COUNT CHALLENGE */}
                    {ch.challenge_type === "count" && (
                      <div className="flex items-center justify-center gap-6 py-2">
                        <button onClick={() => updateScore.mutate({ challengeId: ch.id, delta: -1 })}
                          className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center active:scale-90 transition-transform">
                          <Minus className="h-6 w-6" />
                        </button>
                        <span className="text-4xl font-bold text-foreground tabular-nums min-w-[60px] text-center">{myPart.score || 0}</span>
                        <button onClick={() => updateScore.mutate({ challengeId: ch.id, delta: 1 })}
                          className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform">
                          <Plus className="h-6 w-6" />
                        </button>
                      </div>
                    )}

                    {/* TIME CHALLENGE */}
                    {ch.challenge_type === "time" && (
                      <div className="text-center space-y-3 py-2">
                        <p className="text-3xl font-mono font-bold text-foreground tabular-nums">
                          {timerChallengeId === ch.id ? formatMs(timerElapsed) : "0:00.00"}
                        </p>
                        <div className="flex gap-2 justify-center">
                          {(!timerRunning || timerChallengeId !== ch.id) ? (
                            <Button size="sm" className="rounded-xl" onClick={() => {
                              setTimerChallengeId(ch.id);
                              setTimerStart(Date.now());
                              setTimerElapsed(0);
                              setTimerRunning(true);
                            }}>
                              <Play className="h-3 w-3 mr-1" /> Start
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" className="rounded-xl" onClick={() => {
                                setTimerRunning(false);
                                saveTime.mutate({ challengeId: ch.id, timeMs: timerElapsed });
                                toast({ title: "Zeit gespeichert! ⏱️" });
                              }}>
                                <Save className="h-3 w-3 mr-1" /> Speichern
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                                setTimerRunning(false);
                                setTimerElapsed(0);
                                setTimerChallengeId(null);
                              }}>
                                <X className="h-3 w-3 mr-1" /> Verwerfen
                              </Button>
                            </>
                          )}
                        </div>
                        {myPart.best_time_ms && <p className="text-xs text-muted-foreground">🏆 Beste: {formatMs(myPart.best_time_ms)}</p>}
                      </div>
                    )}

                    {/* ENDURANCE CHALLENGE */}
                    {ch.challenge_type === "endurance" && !myPart.given_up && (
                      <div className="text-center space-y-3 py-2">
                        <EnduranceTimer startedAt={myPart.started_at} />
                        <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => giveUp.mutate(ch.id)}>
                          <Flag className="h-3 w-3 mr-1" /> Aufgeben
                        </Button>
                        <p className="text-[10px] text-muted-foreground">⚠️ Kann nicht rückgängig gemacht werden</p>
                      </div>
                    )}
                    {ch.challenge_type === "endurance" && myPart.given_up && (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        Aufgegeben nach {formatDuration(new Date(myPart.started_at), new Date(myPart.ended_at))}
                      </p>
                    )}
                  </>
                )}

                {/* Leaderboard */}
                {sorted.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rangliste</p>
                    {sorted.map((p: any, idx: number) => (
                      <div key={p.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-secondary/50">
                        <span className="text-foreground">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`} {getDisplayName(p.user_id)}
                        </span>
                        <span className="text-muted-foreground tabular-nums font-mono">
                          {ch.challenge_type === "count" && (p.score || 0)}
                          {ch.challenge_type === "time" && (p.best_time_ms ? formatMs(p.best_time_ms) : "—")}
                          {ch.challenge_type === "endurance" && (p.given_up ? formatDuration(new Date(p.started_at), new Date(p.ended_at)) : "⏳ Läuft...")}
                        </span>
                      </div>
                    ))}
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
                  <Input value={startTime} onChange={e => setStartTime(e.target.value)} type="time" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" placeholder="Start" />
                  <Input value={endTime} onChange={e => setEndTime(e.target.value)} type="time" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" placeholder="Ende" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim() || !date || !startTime || !endTime}>Erstellen</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canEvents && (
        <p className="text-center text-xs text-muted-foreground py-4">Du hast keine Event-Berechtigung</p>
      )}

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
                  <p className="text-xs text-muted-foreground mt-1">
                    📅 {format(new Date(event.event_date), "dd. MMM yyyy", { locale: de })} · {event.start_time?.slice(0, 5)} – {event.end_time?.slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">{attendees.length} Zusagen</span>
                    {attendees.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {attendees.map((r: any) => (
                          <span key={r.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            {getDisplayName(r.user_id)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={myRsvp?.status === "attending" ? "default" : "outline"} className="rounded-xl text-xs h-7"
                      onClick={() => canEvents && rsvp.mutate({ eventId: event.id, status: "attending" })} disabled={!canEvents}>
                      Zusagen
                    </Button>
                    <Button size="sm" variant={myRsvp?.status === "declined" ? "destructive" : "outline"} className="rounded-xl text-xs h-7"
                      onClick={() => canEvents && rsvp.mutate({ eventId: event.id, status: "declined" })} disabled={!canEvents}>
                      Absagen
                    </Button>
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

/* ============ SETTINGS TAB ============ */
function SettingsTab({ groupId, group }: { groupId: string; group: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: members = [] } = useGroupMembers(groupId);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isOwner = group?.owner_id === user?.id;
  const myMember = members.find((m: any) => m.user_id === user?.id);
  const isSettingsAdmin = myMember?.role === "admin";

  const startEdit = () => {
    setEditName(group?.name || "");
    setEditDesc(group?.description || "");
    setEditing(true);
  };

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

  const leaveGroup = async () => {
    if (!confirm("Möchtest du die Gruppe wirklich verlassen?")) return;
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user!.id);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gruppe verlassen" });
    navigate("/groups");
  };

  const deleteGroup = async () => {
    if (!confirm("Möchtest du die Gruppe wirklich löschen? Das kann nicht rückgängig gemacht werden.")) return;
    // Delete members, then group
    await supabase.from("group_members").delete().eq("group_id", groupId);
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) { toast({ title: "Fehler", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Gruppe gelöscht" });
    navigate("/groups");
  };

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-6">
      {/* Group Info - admin only */}
      {isSettingsAdmin && (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Gruppeninfo</h3>
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer">
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden">
              {group?.avatar_url ? (
                <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            {uploading && <div className="absolute inset-0 bg-background/50 rounded-2xl flex items-center justify-center">
              <div className="h-4 w-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            </div>}
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

      {/* Members & Permissions - admin only */}
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
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5">
                            <ShieldCheck className="h-2.5 w-2.5" /> Admin
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">Mitglied</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isCurrentUser && !memberIsAdmin && (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7"
                      onClick={() => updateMemberRole(member.id, "admin")}>
                      <Shield className="h-3 w-3 mr-1" /> Admin
                    </Button>
                  )}
                  {!isCurrentUser && memberIsAdmin && member.user_id !== group?.owner_id && (
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7"
                      onClick={() => updateMemberRole(member.id, "member")}>
                      Admin entfernen
                    </Button>
                  )}
                </div>

                {!memberIsAdmin && !isCurrentUser && (
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    {[
                      { key: "can_chat", label: "Chat" },
                      { key: "can_todos", label: "Aufgaben" },
                      { key: "can_challenges", label: "Challenges" },
                      { key: "can_events", label: "Events" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{label}</span>
                        <Switch
                          checked={member[key] !== false}
                          onCheckedChange={(val) => updateMemberPermission(member.id, key, val)}
                        />
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

      {/* Danger zone */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-destructive">Gefahrenzone</h3>
        <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10" onClick={leaveGroup}>
          Gruppe verlassen
        </Button>
        {isOwner && (
          <Button variant="destructive" className="w-full rounded-xl" onClick={deleteGroup}>
            Gruppe löschen
          </Button>
        )}
      </div>
    </div>
  );
}

export default GroupDetail;
