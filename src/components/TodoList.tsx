import { useState } from "react";
import { Check, Plus, Trash2, Calendar, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from "@/hooks/use-todos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TodoCompletionPostDialog } from "@/components/TodoCompletionPostDialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const RECURRENCE_OPTIONS = [
  { value: "none", label: "Keine Wiederholung" },
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
];

const TodoList = () => {
  const [newTodo, setNewTodo] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [completedTodo, setCompletedTodo] = useState<{ id: string; title: string } | null>(null);
  const { data: todos = [], isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    createTodo.mutate({
      title: newTodo.trim(),
      due_date: dueDate || undefined,
      due_time: dueTime || undefined,
      recurrence: recurrence !== "none" ? recurrence : undefined,
    });
    setNewTodo("");
    setDueDate("");
    setDueTime("");
    setRecurrence("none");
    setShowAdvanced(false);
  };

  const handleToggle = (todo: any) => {
    const nowCompleted = !todo.completed;
    toggleTodo.mutate({ id: todo.id, completed: nowCompleted });
    if (nowCompleted) {
      setCompletedTodo({ id: todo.id, title: todo.title });
    }
  };

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Meine Aufgaben</h2>
        <span className="text-xs text-muted-foreground">{activeTodos.length} offen</span>
      </div>

      {/* Add todo */}
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Neue Aufgabe..."
            className="h-10 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all ${showAdvanced ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="submit"
            className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showAdvanced && (
          <div className="p-3 rounded-xl bg-secondary space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Fällig am
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="h-9 rounded-lg bg-card border-0 text-xs text-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Uhrzeit</label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                  className="h-9 rounded-lg bg-card border-0 text-xs text-foreground"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Wiederholung
              </label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="h-9 rounded-lg bg-card border-0 text-xs text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </form>

      {/* Todo items */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {activeTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => handleToggle(todo)}
              onDelete={() => deleteTodo.mutate(todo.id)}
            />
          ))}
          {completedTodos.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-3 pb-1">Erledigt</p>
              {completedTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={() => handleToggle(todo)}
                  onDelete={() => deleteTodo.mutate(todo.id)}
                />
              ))}
            </>
          )}
          {todos.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Noch keine Aufgaben. Fang an! ✨
            </p>
          )}
        </div>
      )}

      {completedTodo && (
        <TodoCompletionPostDialog
          open={!!completedTodo}
          onClose={() => setCompletedTodo(null)}
          todoId={completedTodo.id}
          todoTitle={completedTodo.title}
        />
      )}
    </div>
  );
};

function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const hasMeta = todo.due_date || todo.recurrence;
  return (
    <div className="group flex items-start gap-3 p-3 rounded-xl bg-card shadow-soft transition-all duration-200 hover:shadow-card">
      <button
        onClick={onToggle}
        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 mt-0.5 ${
          todo.completed
            ? "bg-success border-success"
            : "border-muted-foreground/30 hover:border-foreground/50"
        }`}
      >
        {todo.completed && <Check className="h-3 w-3 text-success-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm transition-all duration-200 block ${
            todo.completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {todo.title}
        </span>
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
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all duration-200"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default TodoList;
