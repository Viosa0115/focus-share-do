import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useTodos, useCreateTodo } from "@/hooks/use-todos";
import { useTodoLabels } from "@/hooks/use-todo-labels";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LABEL_COLORS = ["#6366f1", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];

export function TodoCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [labelId, setLabelId] = useState("none");
  const [dueTime, setDueTime] = useState("");

  const { data: todos = [] } = useTodos();
  const { data: labels = [] } = useTodoLabels();
  const createTodo = useCreateTodo();

  const today = new Date();

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // Map todos to dates
  const todosByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (todos as any[]).forEach((todo: any) => {
      if (todo.completed) return;
      const dates: string[] = [];

      if (todo.recurrence === "daily") {
        // Show on every day of the visible month
        days.forEach(d => dates.push(format(d, "yyyy-MM-dd")));
      } else if (todo.recurrence === "weekly" && todo.due_date) {
        const dueDay = getDay(new Date(todo.due_date));
        days.forEach(d => { if (getDay(d) === dueDay) dates.push(format(d, "yyyy-MM-dd")); });
      } else if (todo.recurrence === "monthly" && todo.due_date) {
        const dueDate = new Date(todo.due_date).getDate();
        days.forEach(d => { if (d.getDate() === dueDate) dates.push(format(d, "yyyy-MM-dd")); });
      } else if (todo.due_date) {
        dates.push(format(new Date(todo.due_date), "yyyy-MM-dd"));
      }

      dates.forEach(dateStr => {
        if (!map[dateStr]) map[dateStr] = [];
        if (!map[dateStr].find((t: any) => t.id === todo.id)) {
          map[dateStr].push(todo);
        }
      });
    });
    return map;
  }, [todos, days]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedTodos = selectedDateStr ? (todosByDate[selectedDateStr] || []) : [];

  const getLabel = (id: string | null) => id ? (labels as any[]).find((l: any) => l.id === id) : null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedDate) return;
    createTodo.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: format(selectedDate, "yyyy-MM-dd"),
      due_time: dueTime || undefined,
      recurrence: recurrence !== "none" ? recurrence : undefined,
      label_id: labelId !== "none" ? labelId : undefined,
    });
    setTitle(""); setDescription(""); setRecurrence("none"); setLabelId("none"); setDueTime(""); setShowCreate(false);
  };

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy", { locale: de })}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const todosForDay = todosByDate[dateStr] || [];
          const isToday = isSameDay(d, today);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const isSelected = selectedDate && isSameDay(d, selectedDate);

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(d)}
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-colors text-xs
                ${!isCurrentMonth ? "text-muted-foreground/30" : "text-foreground"}
                ${isToday ? "bg-primary/10 font-bold" : ""}
                ${isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-secondary"}
              `}
            >
              <span>{d.getDate()}</span>
              {todosForDay.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {todosForDay.slice(0, 3).map((t: any, j: number) => {
                    const label = getLabel(t.label_id);
                    return <div key={j} className="h-1 w-1 rounded-full" style={{ backgroundColor: label?.color || "hsl(var(--primary))" }} />;
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="bg-card rounded-xl p-3 shadow-soft space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              {format(selectedDate, "EEEE, dd. MMMM", { locale: de })}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setShowCreate(true)} className="h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Plus className="h-3 w-3" />
              </button>
              <button onClick={() => setSelectedDate(null)} className="h-6 w-6 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          {selectedTodos.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Keine Aufgaben an diesem Tag</p>
          ) : (
            <div className="space-y-1.5">
              {selectedTodos.map((todo: any) => {
                const label = getLabel(todo.label_id);
                return (
                  <div key={todo.id} className="flex items-center gap-2 py-1">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: label?.color || "hsl(var(--muted-foreground))" }} />
                    <span className="text-xs text-foreground truncate">{todo.title}</span>
                    {todo.due_time && <span className="text-[10px] text-muted-foreground ml-auto">{todo.due_time.slice(0, 5)}</span>}
                    {todo.recurrence && todo.recurrence !== "none" && (
                      <span className="text-[9px] text-muted-foreground">🔄</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Neue Aufgabe am {selectedDate && format(selectedDate, "dd. MMM", { locale: de })}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Aufgabe..." required className="h-10 rounded-xl bg-secondary border-0 text-foreground" />
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Beschreibung (optional)" className="rounded-xl bg-secondary border-0 text-xs text-foreground resize-none" rows={2} />
            <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="h-9 rounded-xl bg-secondary border-0 text-xs text-foreground" />
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger className="h-9 rounded-xl bg-secondary border-0 text-xs text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Wiederholung</SelectItem>
                <SelectItem value="daily">Täglich</SelectItem>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
                <SelectItem value="monthly">Monatlich</SelectItem>
              </SelectContent>
            </Select>
            {(labels as any[]).length > 0 && (
              <Select value={labelId} onValueChange={setLabelId}>
                <SelectTrigger className="h-9 rounded-xl bg-secondary border-0 text-xs text-foreground"><SelectValue /></SelectTrigger>
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
            )}
            <Button type="submit" className="w-full h-10 rounded-xl" disabled={!title.trim()}>Erstellen</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
