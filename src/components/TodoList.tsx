import { useState, useEffect } from "react";
import { Check, Plus, Trash2, Calendar, RefreshCw, ChevronDown, ChevronUp, Tag, FileText, Trophy, Minus, Play, Square, Flag, Save, X, Clock, Star, Award, Timer } from "lucide-react";
import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from "@/hooks/use-todos";
import { useTodoLabels, useCreateLabel, useDeleteLabel } from "@/hooks/use-todo-labels";
import { usePersonalChallenges, useCreatePersonalChallenge, useUpdatePersonalChallenge, useDeletePersonalChallenge } from "@/hooks/use-personal-challenges";
import { useTodoStreaks, useUpdateStreak } from "@/hooks/use-todo-streaks";
import { useSaveTodoCompletion } from "@/hooks/use-todo-completions";
import { useChallengeTimes, useSaveChallengeTime } from "@/hooks/use-personal-challenge-times";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TodoCompletionPostDialog } from "@/components/TodoCompletionPostDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StreakBadge } from "@/components/StreakBadge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const LABEL_COLORS = ["#6366f1", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];

const TodoList = () => {
  const [completedTodo, setCompletedTodo] = useState<{ id: string; title: string; description?: string; streakCount?: number } | null>(null);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="todos">
        <TabsList className="w-full rounded-xl">
          <TabsTrigger value="todos" className="flex-1 rounded-lg text-xs">Aufgaben</TabsTrigger>
          <TabsTrigger value="challenges" className="flex-1 rounded-lg text-xs">Challenges</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="mt-4">
          <TodosSection completedTodo={completedTodo} setCompletedTodo={setCompletedTodo} />
        </TabsContent>

        <TabsContent value="challenges" className="mt-4">
          <PersonalChallengesSection />
        </TabsContent>
      </Tabs>

      {completedTodo && (
        <TodoCompletionPostDialog
          open={!!completedTodo}
          onClose={() => setCompletedTodo(null)}
          todoId={completedTodo.id}
          todoTitle={completedTodo.title}
          todoDescription={completedTodo.description}
          streakCount={completedTodo.streakCount}
        />
      )}
    </div>
  );
};

function TodosSection({ completedTodo, setCompletedTodo }: { completedTodo: any; setCompletedTodo: (v: any) => void }) {
  const [newTodo, setNewTodo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [description, setDescription] = useState("");
  const [labelId, setLabelId] = useState("none");
  const [showLabelCreate, setShowLabelCreate] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  const { data: todos = [], isLoading } = useTodos();
  const { data: labels = [] } = useTodoLabels();
  const { data: streaks = [] } = useTodoStreaks();
  const createTodo = useCreateTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();
  const createLabel = useCreateLabel();
  const deleteLabel = useDeleteLabel();
  const updateStreak = useUpdateStreak();
  const saveTodoCompletion = useSaveTodoCompletion();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    createTodo.mutate({
      title: newTodo.trim(),
      description: description.trim() || undefined,
      due_date: dueDate || undefined,
      due_time: dueTime || undefined,
      recurrence: recurrence !== "none" ? recurrence : undefined,
      label_id: labelId !== "none" ? labelId : undefined,
    });
    setNewTodo("");
    setDescription("");
    setDueDate("");
    setDueTime("");
    setRecurrence("none");
    setLabelId("none");
    setShowAdvanced(false);
  };

  const handleToggle = async (todo: any) => {
    const nowCompleted = !todo.completed;
    toggleTodo.mutate({ id: todo.id, completed: nowCompleted });
    if (nowCompleted) {
      let streakCount = 0;
      // Save completion to history
      saveTodoCompletion.mutate({
        todo_id: todo.id,
        title: todo.title,
        description: todo.description,
        recurrence: todo.recurrence,
        label_id: todo.label_id,
      });
      // Update streak for recurring todos
      if (todo.recurrence && todo.recurrence !== "none") {
        try {
          streakCount = await updateStreak.mutateAsync({
            todoId: todo.id,
            todoTitle: todo.title,
            recurrence: todo.recurrence,
          }) as number;
        } catch {}
      }
      setCompletedTodo({ id: todo.id, title: todo.title, description: todo.description, streakCount });
    }
  };

  const activeTodos = todos.filter((t: any) => !t.completed);
  const completedTodos = todos.filter((t: any) => t.completed);

  const einmalig = activeTodos.filter((t: any) => !t.recurrence || t.recurrence === "none");
  const daily = activeTodos.filter((t: any) => t.recurrence === "daily");
  const weekly = activeTodos.filter((t: any) => t.recurrence === "weekly");
  const monthly = activeTodos.filter((t: any) => t.recurrence === "monthly");

  const getLabel = (id: string | null) => id ? (labels as any[]).find((l: any) => l.id === id) : null;
  const getStreak = (todoId: string) => (streaks as any[]).find((s: any) => s.todo_id === todoId);

  const sections = [
    { key: "einmalig", label: "Einmalig", items: einmalig },
    { key: "daily", label: "Täglich", items: daily },
    { key: "weekly", label: "Wöchentlich", items: weekly },
    { key: "monthly", label: "Monatlich", items: monthly },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Meine Aufgaben</h2>
        <div className="flex items-center gap-2">
          <Dialog open={showLabelCreate} onOpenChange={setShowLabelCreate}>
            <DialogTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <Tag className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader><DialogTitle>Labels verwalten</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} placeholder="Label Name" className="h-10 rounded-xl bg-secondary border-0 text-foreground" />
                  <div className="flex gap-2 flex-wrap">
                    {LABEL_COLORS.map((c) => (
                      <button key={c} onClick={() => setNewLabelColor(c)}
                        className={`h-7 w-7 rounded-full transition-transform ${newLabelColor === c ? "scale-125 ring-2 ring-offset-2 ring-foreground" : ""}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <Button size="sm" className="rounded-xl" disabled={!newLabelName.trim()}
                    onClick={() => { createLabel.mutate({ name: newLabelName.trim(), color: newLabelColor }); setNewLabelName(""); }}>
                    Erstellen
                  </Button>
                </div>
                {(labels as any[]).length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    {(labels as any[]).map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} />
                          <span className="text-sm text-foreground">{l.name}</span>
                        </div>
                        <button onClick={() => deleteLabel.mutate(l.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <span className="text-xs text-muted-foreground">{activeTodos.length} offen</span>
        </div>
      </div>

      {/* Add todo */}
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <Input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="Neue Aufgabe..."
            className="h-10 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground" />
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${showAdvanced ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button type="submit" className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-transform active:scale-95">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showAdvanced && (
          <div className="p-3 rounded-xl bg-secondary space-y-3">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beschreibung (optional)"
              className="rounded-lg bg-card border-0 text-xs resize-none text-foreground" rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Fällig am</label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9 rounded-lg bg-card border-0 text-xs text-foreground" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Uhrzeit</label>
                <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="h-9 rounded-lg bg-card border-0 text-xs text-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Wiederholung</label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="h-9 rounded-lg bg-card border-0 text-xs text-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine</SelectItem>
                  <SelectItem value="daily">Täglich</SelectItem>
                  <SelectItem value="weekly">Wöchentlich</SelectItem>
                  <SelectItem value="monthly">Monatlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(labels as any[]).length > 0 && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> Label</label>
                <Select value={labelId} onValueChange={setLabelId}>
                  <SelectTrigger className="h-9 rounded-lg bg-card border-0 text-xs text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Label</SelectItem>
                    {(labels as any[]).map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                          {l.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </form>

      {/* Todo sections */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          {sections.map(({ key, label, items }) => items.length > 0 && (
            <div key={key} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
              {items.map((todo: any) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  label={getLabel(todo.label_id)}
                  streak={getStreak(todo.id)}
                  onToggle={() => handleToggle(todo)}
                  onDelete={() => deleteTodo.mutate(todo.id)}
                />
              ))}
            </div>
          ))}
          {activeTodos.length === 0 && completedTodos.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Noch keine Aufgaben. Fang an! ✨</p>
          )}
          {completedTodos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">Erledigt</p>
              {completedTodos.map((todo: any) => (
                <TodoItem key={todo.id} todo={todo} label={getLabel(todo.label_id)} streak={getStreak(todo.id)} onToggle={() => handleToggle(todo)} onDelete={() => deleteTodo.mutate(todo.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo, label, streak, onToggle, onDelete }: { todo: any; label: any; streak: any; onToggle: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasMeta = todo.due_date || todo.recurrence;
  const hasStreak = streak && streak.current_streak > 0;
  return (
    <div className="group p-3 rounded-xl bg-card shadow-soft transition-all duration-200 hover:shadow-card">
      <div className="flex items-start gap-3">
        <button onClick={onToggle}
          className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 mt-0.5 ${
            todo.completed ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-foreground/50"
          }`}>
          {todo.completed && <Check className="h-3 w-3 text-primary-foreground" />}
        </button>
        <div className="flex-1 min-w-0" onClick={() => todo.description && setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            {label && <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />}
            <span className={`text-sm transition-all duration-200 ${todo.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {todo.title}
            </span>
            {todo.description && <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
            {hasStreak && <StreakBadge streak={streak.current_streak} size="sm" />}
          </div>
          {label && <span className="text-[9px] text-muted-foreground">{label.name}</span>}
          {hasMeta && !todo.completed && (
            <div className="flex items-center gap-2 mt-0.5">
              {todo.due_date && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Calendar className="h-2.5 w-2.5" />
                  {format(new Date(todo.due_date), "dd. MMM", { locale: de })}
                  {todo.due_time && ` ${todo.due_time.slice(0, 5)}`}
                </span>
              )}
              {todo.recurrence && todo.recurrence !== "none" && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <RefreshCw className="h-2.5 w-2.5" />
                  {todo.recurrence === "daily" ? "Täglich" : todo.recurrence === "weekly" ? "Wöchentlich" : "Monatlich"}
                </span>
              )}
            </div>
          )}
          {expanded && todo.description && (
            <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{todo.description}</p>
          )}
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-200">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ============ PERSONAL CHALLENGES ============ */
function PersonalChallengesSection() {
  const { data: challenges = [], isLoading } = usePersonalChallenges();
  const createChallenge = useCreatePersonalChallenge();
  const updateChallenge = useUpdatePersonalChallenge();
  const deleteChallenge = useDeletePersonalChallenge();
  const { data: labels = [] } = useTodoLabels();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"count" | "time" | "endurance">("count");
  const [labelId, setLabelId] = useState("none");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState(0);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerChallengeId, setTimerChallengeId] = useState<string | null>(null);
  const [showTimes, setShowTimes] = useState<string | null>(null);
  const [postChallenge, setPostChallenge] = useState<any | null>(null);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerElapsed(Date.now() - timerStart), 10);
    return () => clearInterval(interval);
  }, [timerRunning, timerStart]);

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    const frac = Math.floor((ms % 1000) / 10);
    return `${min}:${sec.toString().padStart(2, "0")}.${frac.toString().padStart(2, "0")}`;
  };

  const getLabel = (id: string | null) => id ? (labels as any[]).find((l: any) => l.id === id) : null;

  // Check if count challenge has ended
  const isCountEnded = (ch: any) => {
    if (!ch.end_date) return false;
    const end = new Date(`${ch.end_date}${ch.end_time ? "T" + ch.end_time : "T23:59:59"}`);
    return new Date() > end;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Meine Challenges</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl text-xs h-8"><Plus className="h-3 w-3 mr-1" /> Neu</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Neue Challenge</DialogTitle></DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createChallenge.mutate({
                name,
                challenge_type: type,
                label_id: labelId !== "none" ? labelId : undefined,
                end_date: endDate || undefined,
                end_time: endTime || undefined,
              } as any);
              setName(""); setType("count"); setLabelId("none"); setEndDate(""); setEndTime(""); setShowAdvanced(false);
              setShowCreate(false);
            }} className="space-y-4">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required className="h-12 rounded-xl bg-secondary border-0 text-foreground" />
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Typ</label>
                <div className="flex gap-2">
                  {([["count", "🔢 Zählen"], ["time", "⏱️ Zeit"], ["endurance", "💪 Durchhalten"]] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setType(val)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${type === val ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {(labels as any[]).length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> Label</label>
                  <Select value={labelId} onValueChange={setLabelId}>
                    <SelectTrigger className="h-9 rounded-lg bg-secondary border-0 text-xs text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Label</SelectItem>
                      {(labels as any[]).map((l: any) => (
                        <SelectItem key={l.id} value={l.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                            {l.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {type === "count" && (
                <div className="space-y-1">
                  <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Enddatum & -uhrzeit setzen
                    {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {showAdvanced && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 rounded-lg bg-secondary border-0 text-xs text-foreground" />
                      <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-9 rounded-lg bg-secondary border-0 text-xs text-foreground" />
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full h-12 rounded-xl" disabled={!name.trim()}>Erstellen</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />)}</div>
      ) : (challenges as any[]).length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Noch keine persönlichen Challenges</p>
      ) : (
        <div className="space-y-3">
          {(challenges as any[]).map((ch: any) => (
            <ChallengeCard
              key={ch.id}
              ch={ch}
              label={getLabel(ch.label_id)}
              isCountEnded={isCountEnded(ch)}
              timerRunning={timerRunning}
              timerChallengeId={timerChallengeId}
              timerElapsed={timerElapsed}
              formatMs={formatMs}
              showTimes={showTimes}
              setShowTimes={setShowTimes}
              onTimerStart={() => {
                setTimerChallengeId(ch.id);
                setTimerStart(Date.now());
                setTimerElapsed(0);
                setTimerRunning(true);
              }}
              onTimerSave={() => {
                setTimerRunning(false);
                updateChallenge.mutate({ id: ch.id, updates: { best_time_ms: ch.best_time_ms ? Math.min(ch.best_time_ms, timerElapsed) : timerElapsed } });
                return timerElapsed;
              }}
              onTimerDiscard={() => {
                setTimerRunning(false);
                setTimerElapsed(0);
                setTimerChallengeId(null);
              }}
              onUpdate={(updates: any) => updateChallenge.mutate({ id: ch.id, updates })}
              onDelete={() => deleteChallenge.mutate(ch.id)}
              onPost={() => setPostChallenge(ch)}
              toast={toast}
            />
          ))}
        </div>
      )}

      {postChallenge && (
        <TodoCompletionPostDialog
          open={!!postChallenge}
          onClose={() => setPostChallenge(null)}
          todoTitle={postChallenge.name}
          todoDescription={`${postChallenge.challenge_type === "count" ? `Zähler: ${postChallenge.score}` : postChallenge.challenge_type === "time" ? `Beste Zeit: ${formatMs(postChallenge.best_time_ms || 0)}` : "Durchhalten Challenge"}`}
        />
      )}
    </div>
  );
}

function ChallengeCard({ ch, label, isCountEnded, timerRunning, timerChallengeId, timerElapsed, formatMs, showTimes, setShowTimes, onTimerStart, onTimerSave, onTimerDiscard, onUpdate, onDelete, onPost, toast }: any) {
  const saveChallengeTime = useSaveChallengeTime();
  const { data: times = [] } = useChallengeTimes(showTimes === ch.id ? ch.id : "");

  return (
    <div className="p-4 rounded-2xl bg-card shadow-soft space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {label && <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />}
          <div>
            <h4 className="font-medium text-sm text-foreground">{ch.name}</h4>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground">
                {ch.challenge_type === "count" ? "🔢 Zählen" : ch.challenge_type === "time" ? "⏱️ Zeit" : "💪 Durchhalten"}
              </p>
              {label && <span className="text-[9px] text-muted-foreground">· {label.name}</span>}
              {isCountEnded && <span className="text-[9px] text-destructive">· Abgelaufen</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onPost} className="text-muted-foreground hover:text-primary transition-colors" title="Posten">
            <Award className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* COUNT */}
      {ch.challenge_type === "count" && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-6 py-2">
            <button
              disabled={isCountEnded}
              onClick={() => onUpdate({ score: Math.max(0, (ch.score || 0) - 1) })}
              className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40">
              <Minus className="h-6 w-6" />
            </button>
            <span className="text-4xl font-bold text-foreground tabular-nums min-w-[60px] text-center">{ch.score || 0}</span>
            <button
              disabled={isCountEnded}
              onClick={() => onUpdate({ score: (ch.score || 0) + 1 })}
              className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40">
              <Plus className="h-6 w-6" />
            </button>
          </div>
          {ch.end_date && (
            <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Ende: {format(new Date(ch.end_date), "dd. MMM", { locale: de })}
              {ch.end_time && ` ${ch.end_time.slice(0, 5)}`}
            </p>
          )}
        </div>
      )}

      {/* TIME */}
      {ch.challenge_type === "time" && (
        <div className="text-center space-y-3 py-2">
          <p className="text-3xl font-mono font-bold text-foreground tabular-nums">
            {timerChallengeId === ch.id ? formatMs(timerElapsed) : "0:00.00"}
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {(!timerRunning || timerChallengeId !== ch.id) ? (
              <Button size="sm" className="rounded-xl" onClick={onTimerStart}>
                <Play className="h-3 w-3 mr-1" /> Start
              </Button>
            ) : (
              <>
                <Button size="sm" className="rounded-xl" onClick={() => {
                  const elapsed = onTimerSave();
                  saveChallengeTime.mutate({ challengeId: ch.id, timeMs: elapsed });
                  toast({ title: "Zeit gespeichert! ⏱️" });
                }}>
                  <Save className="h-3 w-3 mr-1" /> Speichern
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={onTimerDiscard}>
                  <X className="h-3 w-3 mr-1" /> Verwerfen
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowTimes(showTimes === ch.id ? null : ch.id)}>
              <Timer className="h-3 w-3 mr-1" /> Top 10
            </Button>
          </div>
          {ch.best_time_ms && <p className="text-xs text-muted-foreground">🏆 Beste: {formatMs(ch.best_time_ms)}</p>}
          {showTimes === ch.id && (
            <div className="text-left space-y-1 pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top 10 Zeiten</p>
              {(times as any[]).length === 0 ? (
                <p className="text-xs text-muted-foreground">Noch keine Zeiten gespeichert</p>
              ) : (
                (times as any[]).map((t: any, i: number) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    <span className="text-xs font-mono text-foreground">{formatMs(t.time_ms)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ENDURANCE */}
      {ch.challenge_type === "endurance" && !ch.given_up && (
        <div className="text-center space-y-3 py-2">
          <EnduranceTimer startedAt={ch.started_at} />
          {ch.longest_time_ms && (
            <p className="text-xs text-muted-foreground">🏅 Längstes: {formatDuration(0, ch.longest_time_ms)}</p>
          )}
          <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => {
            const elapsed = Date.now() - new Date(ch.started_at).getTime();
            const longest = ch.longest_time_ms ? Math.max(ch.longest_time_ms, elapsed) : elapsed;
            onUpdate({ given_up: true, ended_at: new Date().toISOString(), longest_time_ms: longest });
          }}>
            <Flag className="h-3 w-3 mr-1" /> Aufgeben
          </Button>
        </div>
      )}
      {ch.challenge_type === "endurance" && ch.given_up && (
        <div className="text-center space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Aufgegeben nach {formatDuration(new Date(ch.started_at).getTime(), new Date(ch.ended_at).getTime())}
          </p>
          {ch.longest_time_ms && (
            <p className="text-xs text-muted-foreground">🏅 Längstes: {formatDuration(0, ch.longest_time_ms)}</p>
          )}
          <Button size="sm" className="rounded-xl" onClick={() => {
            onUpdate({ given_up: false, started_at: new Date().toISOString(), ended_at: null });
            toast({ title: "Neustart! 💪" });
          }}>
            <Play className="h-3 w-3 mr-1" /> Neu starten
          </Button>
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

function formatDuration(startMs: number, endMs: number) {
  const ms = endMs - startMs;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}T ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export default TodoList;
