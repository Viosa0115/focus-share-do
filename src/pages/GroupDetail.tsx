import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, CheckSquare, Trophy, Calendar, Copy, Users, Settings, Send, Plus, Minus, Play, Square, Clock, Flag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useGroupMessages, useSendMessage } from "@/hooks/use-group-chat";
import { useGroupTodos, useCreateGroupTodo, useToggleGroupTodo } from "@/hooks/use-group-todos";
import { useChallenges, useCreateChallenge, useJoinChallenge, useUpdateScore, useSaveTime, useGiveUp } from "@/hooks/use-challenges";
import { useGroupEvents, useCreateEvent, useRsvp } from "@/hooks/use-events";
import { useGroupMembers } from "@/hooks/use-group-members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type TabKey = "chat" | "todos" | "challenges" | "events";

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

  const tabs: { key: TabKey; label: string; icon: any; show: boolean }[] = [
    { key: "chat", label: "Chat", icon: MessageCircle, show: true },
    { key: "todos", label: "Aufgaben", icon: CheckSquare, show: group?.has_todos ?? true },
    { key: "challenges", label: "Challenges", icon: Trophy, show: group?.has_challenges ?? false },
    { key: "events", label: "Events", icon: Calendar, show: group?.has_events ?? false },
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
        {activeTab === "chat" && <ChatTab groupId={id} />}
        {activeTab === "todos" && <TodosTab groupId={id} />}
        {activeTab === "challenges" && <ChallengesTab groupId={id} />}
        {activeTab === "events" && <EventsTab groupId={id} />}
      </div>
    </div>
  );
};

/* ============ CHAT TAB ============ */
function ChatTab({ groupId }: { groupId: string }) {
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
    if (!text.trim()) return;
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
    </div>
  );
}

/* ============ TODOS TAB ============ */
function TodosTab({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { data: todos = [], isLoading } = useGroupTodos(groupId);
  const createTodo = useCreateGroupTodo(groupId);
  const toggleTodo = useToggleGroupTodo(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [completionType, setCompletionType] = useState<"single" | "all">("single");

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Gruppenaufgaben</h3>
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
              createTodo.mutate({ title, completionType });
              setTitle("");
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
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={!title.trim()}>Erstellen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                  <button onClick={() => toggleTodo.mutate({ todoId: todo.id, completed: !myCompletion })}
                    className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${myCompletion ? "bg-success border-success" : "border-muted-foreground/30"}`}>
                    {myCompletion && <CheckSquare className="h-3 w-3 text-success-foreground" />}
                  </button>
                  <div className="flex-1">
                    <span className={`text-sm ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{todo.title}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {completedCount}/{todo.completion_type === "all" ? totalMembers : 1} erledigt
                    </p>
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
function ChallengesTab({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { data: challenges = [], isLoading } = useChallenges(groupId);
  const createChallenge = useCreateChallenge(groupId);
  const joinChallenge = useJoinChallenge(groupId);
  const updateScore = useUpdateScore(groupId);
  const saveTime = useSaveTime(groupId);
  const giveUp = useGiveUp(groupId);
  const { data: members = [] } = useGroupMembers(groupId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"count" | "time" | "endurance">("count");
  const [days, setDays] = useState("7");

  // Timer state for time challenges
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState(0);
  const [timerElapsed, setTimerElapsed] = useState(0);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerElapsed(Date.now() - timerStart), 10);
    return () => clearInterval(interval);
  }, [timerRunning, timerStart]);

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
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Neue Challenge</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createChallenge.mutate({ name, challenge_type: type, start_date: new Date().toISOString(), duration_days: parseInt(days) });
              setName(""); setShowCreate(false);
            }} className="space-y-4">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name..." required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Typ</label>
                <div className="flex gap-2">
                  {([["count", "Zählen"], ["time", "Zeit"], ["endurance", "Durchhalten"]] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setType(val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${type === val ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Input value={days} onChange={e => setDays(e.target.value)} type="number" min="1" max="365" placeholder="Dauer (Tage)" className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim()}>Erstellen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
              // endurance: longest time
              const durA = a.given_up ? new Date(a.ended_at).getTime() - new Date(a.started_at).getTime() : Date.now() - new Date(a.started_at).getTime();
              const durB = b.given_up ? new Date(b.ended_at).getTime() - new Date(b.started_at).getTime() : Date.now() - new Date(b.started_at).getTime();
              return durB - durA;
            });

            return (
              <div key={ch.id} className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm text-foreground">{ch.name}</h4>
                    <p className="text-[10px] text-muted-foreground capitalize">{ch.challenge_type === "count" ? "Zählen" : ch.challenge_type === "time" ? "Beste Zeit" : "Durchhalten"} · {ch.duration_days} Tage</p>
                  </div>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </div>

                {!myPart ? (
                  <Button size="sm" className="w-full rounded-xl" onClick={() => joinChallenge.mutate(ch.id)}>Teilnehmen</Button>
                ) : (
                  <>
                    {ch.challenge_type === "count" && (
                      <div className="flex items-center justify-center gap-4">
                        <button onClick={() => updateScore.mutate({ challengeId: ch.id, delta: -1 })}
                          className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center active:scale-95 transition-transform">
                          <Minus className="h-5 w-5" />
                        </button>
                        <span className="text-3xl font-bold text-foreground tabular-nums">{myPart.score || 0}</span>
                        <button onClick={() => updateScore.mutate({ challengeId: ch.id, delta: 1 })}
                          className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-transform">
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    )}

                    {ch.challenge_type === "time" && (
                      <div className="text-center space-y-2">
                        <p className="text-2xl font-mono font-bold text-foreground tabular-nums">{formatMs(timerElapsed)}</p>
                        <div className="flex gap-2 justify-center">
                          {!timerRunning ? (
                            <Button size="sm" className="rounded-xl" onClick={() => { setTimerStart(Date.now()); setTimerElapsed(0); setTimerRunning(true); }}>
                              <Play className="h-3 w-3 mr-1" /> Start
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                              setTimerRunning(false);
                              saveTime.mutate({ challengeId: ch.id, timeMs: timerElapsed });
                            }}>
                              <Square className="h-3 w-3 mr-1" /> Stopp & Speichern
                            </Button>
                          )}
                        </div>
                        {myPart.best_time_ms && <p className="text-xs text-muted-foreground">Beste: {formatMs(myPart.best_time_ms)}</p>}
                      </div>
                    )}

                    {ch.challenge_type === "endurance" && !myPart.given_up && (
                      <div className="text-center space-y-2">
                        <EnduranceTimer startedAt={myPart.started_at} />
                        <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => giveUp.mutate(ch.id)}>
                          <Flag className="h-3 w-3 mr-1" /> Aufgeben
                        </Button>
                      </div>
                    )}
                    {ch.challenge_type === "endurance" && myPart.given_up && (
                      <p className="text-center text-sm text-muted-foreground">Aufgegeben nach {formatDuration(new Date(myPart.started_at), new Date(myPart.ended_at))}</p>
                    )}
                  </>
                )}

                {/* Leaderboard */}
                {sorted.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    <p className="text-[10px] font-medium text-muted-foreground">Rangliste</p>
                    {sorted.map((p: any, idx: number) => (
                      <div key={p.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-foreground">{idx + 1}. {getDisplayName(p.user_id)}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {ch.challenge_type === "count" && (p.score || 0)}
                          {ch.challenge_type === "time" && (p.best_time_ms ? formatMs(p.best_time_ms) : "—")}
                          {ch.challenge_type === "endurance" && (p.given_up ? formatDuration(new Date(p.started_at), new Date(p.ended_at)) : "Läuft...")}
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
    <p className="text-2xl font-mono font-bold text-foreground tabular-nums">
      {d > 0 && `${d}d `}{h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:{sec.toString().padStart(2, "0")}
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
function EventsTab({ groupId }: { groupId: string }) {
  const { user } = useAuth();
  const { data: events = [], isLoading } = useGroupEvents(groupId);
  const createEvent = useCreateEvent(groupId);
  const rsvp = useRsvp(groupId);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  return (
    <div className="overflow-y-auto h-full px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Events</h3>
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
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : events.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Noch keine Events</p>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => {
            const rsvps = event.event_rsvps || [];
            const myRsvp = rsvps.find((r: any) => r.user_id === user?.id);
            const attending = rsvps.filter((r: any) => r.status === "attending").length;

            return (
              <div key={event.id} className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
                <div>
                  <h4 className="font-medium text-sm text-foreground">{event.name}</h4>
                  {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {format(new Date(event.event_date), "dd. MMM yyyy", { locale: de })} · {event.start_time?.slice(0, 5)} – {event.end_time?.slice(0, 5)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{attending} Zusagen</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant={myRsvp?.status === "attending" ? "default" : "outline"} className="rounded-xl text-xs h-7"
                      onClick={() => rsvp.mutate({ eventId: event.id, status: "attending" })}>
                      Zusagen
                    </Button>
                    <Button size="sm" variant={myRsvp?.status === "declined" ? "destructive" : "outline"} className="rounded-xl text-xs h-7"
                      onClick={() => rsvp.mutate({ eventId: event.id, status: "declined" })}>
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

export default GroupDetail;
