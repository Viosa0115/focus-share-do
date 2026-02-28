import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from "@/hooks/use-todos";
import { Input } from "@/components/ui/input";

const TodoList = () => {
  const [newTodo, setNewTodo] = useState("");
  const { data: todos = [], isLoading } = useTodos();
  const createTodo = useCreateTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    createTodo.mutate(newTodo.trim());
    setNewTodo("");
  };

  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Meine Aufgaben</h2>
        <span className="text-xs text-muted-foreground">
          {activeTodos.length} offen
        </span>
      </div>

      {/* Add todo */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Neue Aufgabe..."
          className="h-10 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-transform active:scale-95"
        >
          <Plus className="h-4 w-4" />
        </button>
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
              id={todo.id}
              title={todo.title}
              completed={false}
              onToggle={() => toggleTodo.mutate({ id: todo.id, completed: true })}
              onDelete={() => deleteTodo.mutate(todo.id)}
            />
          ))}
          {completedTodos.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-3 pb-1">Erledigt</p>
              {completedTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  id={todo.id}
                  title={todo.title}
                  completed
                  onToggle={() => toggleTodo.mutate({ id: todo.id, completed: false })}
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
    </div>
  );
};

function TodoItem({
  id,
  title,
  completed,
  onToggle,
  onDelete,
}: {
  id: string;
  title: string;
  completed: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl bg-card shadow-soft transition-all duration-200 hover:shadow-card">
      <button
        onClick={onToggle}
        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          completed
            ? "bg-success border-success"
            : "border-muted-foreground/30 hover:border-foreground/50"
        }`}
      >
        {completed && <Check className="h-3 w-3 text-success-foreground" />}
      </button>
      <span
        className={`flex-1 text-sm transition-all duration-200 ${
          completed ? "line-through text-muted-foreground" : "text-foreground"
        }`}
      >
        {title}
      </span>
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
