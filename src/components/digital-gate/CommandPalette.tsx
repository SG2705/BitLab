import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Action {
  label: string;
  action: () => void;
}

interface CommandPaletteProps {
  actions: Action[];
  onClose: () => void;
}

export function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const filtered = actions
    .filter((a) => a.label.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20);

  return (
    <div
      className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-start justify-center pt-24"
      onClick={onClose}
    >
      <div
        className="w-[520px] glass-panel rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown")
                setI((v) => Math.min(v + 1, filtered.length - 1));
              if (e.key === "ArrowUp") setI((v) => Math.max(v - 1, 0));
              if (e.key === "Enter" && filtered[i]) {
                filtered[i].action();
                onClose();
              }
              if (e.key === "Escape") onClose();
            }}
            placeholder="Type a command…"
            className="flex-1 bg-transparent h-12 text-sm outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {filtered.map((a, idx) => (
            <button
              key={a.label}
              onClick={() => {
                a.action();
                onClose();
              }}
              onMouseEnter={() => setI(idx)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                idx === i
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary",
              )}
            >
              {a.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
