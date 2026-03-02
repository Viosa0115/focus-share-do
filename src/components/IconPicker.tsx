import { useState } from "react";
import { TODO_ICONS } from "@/lib/todo-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface IconPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  selected?: string;
}

export function IconPicker({ open, onClose, onSelect, selected }: IconPickerProps) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? TODO_ICONS.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : TODO_ICONS;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Icon wählen</DialogTitle></DialogHeader>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suchen..."
          className="h-9 rounded-xl bg-secondary border-0 text-xs text-foreground px-3 mb-2 w-full outline-none"
        />
        <div className="grid grid-cols-8 gap-1.5 overflow-y-auto max-h-[50vh] p-1">
          <button onClick={() => { onSelect(""); onClose(); }}
            className={`aspect-square rounded-lg flex items-center justify-center text-lg hover:bg-secondary transition-colors ${!selected ? "ring-2 ring-primary bg-primary/10" : ""}`}>
            ✖️
          </button>
          {filtered.map(({ emoji, label }) => (
            <button key={emoji} onClick={() => { onSelect(emoji); onClose(); }}
              title={label}
              className={`aspect-square rounded-lg flex items-center justify-center text-lg hover:bg-secondary transition-colors ${selected === emoji ? "ring-2 ring-primary bg-primary/10" : ""}`}>
              {emoji}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
