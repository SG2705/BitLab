import { GATES } from "@/lib/circuit";

interface GateChipProps {
  type: string;
  onDragStart: () => void;
}

function GateChip({ type, onDragStart }: GateChipProps) {
  const def = GATES[type];

  if (!def) return null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/gate", type);
        onDragStart();
      }}
      className="group cursor-grab active:cursor-grabbing rounded-md border border-border bg-card/60 hover:border-primary/60 hover:bg-card px-2 py-2 text-xs transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col items-center gap-1"
    >
      <div className="h-8 w-full flex items-center justify-center rounded bg-background/60 border border-border/60 font-mono text-[13px] text-primary group-hover:signal-glow">
        {def.symbol ?? def.label.slice(0, 3)}
      </div>
      <div className="text-[10px] text-muted-foreground group-hover:text-foreground truncate w-full text-center">
        {def.label}
      </div>
    </div>
  );
}

export default GateChip;
