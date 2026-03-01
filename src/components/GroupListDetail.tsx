import { useState } from "react";
import { ArrowLeft, Plus, Trash2, CheckSquare } from "lucide-react";
import { useGroupListItems, useCreateGroupListItem, useToggleGroupListItem, useDeleteGroupListItem } from "@/hooks/use-group-lists";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GroupListDetailProps {
  list: any;
  onBack: () => void;
}

export function GroupListDetail({ list, onBack }: GroupListDetailProps) {
  const { data: items = [] } = useGroupListItems(list.id);
  const createItem = useCreateGroupListItem(list.id);
  const toggleItem = useToggleGroupListItem(list.id);
  const deleteItem = useDeleteGroupListItem(list.id);
  const [newTitle, setNewTitle] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{list.name}</h3>
          {list.description && <p className="text-xs text-muted-foreground">{list.description}</p>}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (!newTitle.trim()) return; createItem.mutate(newTitle.trim()); setNewTitle(""); }} className="flex gap-2">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Neuer Eintrag..." className="h-9 rounded-xl bg-secondary border-0 text-sm text-foreground" />
        <Button type="submit" size="sm" className="rounded-xl h-9" disabled={!newTitle.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </form>

      <div className="space-y-1.5">
        {(items as any[]).length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">Noch keine Einträge</p>
        ) : (
          (items as any[]).map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-card shadow-soft">
              <button
                onClick={() => toggleItem.mutate({ itemId: item.id, completed: !item.completed })}
                className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${item.completed ? "bg-primary border-primary" : "border-muted-foreground/30"}`}
              >
                {item.completed && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
              </button>
              <span className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.title}
              </span>
              <button onClick={() => deleteItem.mutate(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
