import { Settings2, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, fm } from "@/lib/utils";
import { GATES } from "@/lib/circuit";
import type { ComponentInstance } from "@/engine";
import { memo } from "react";
import {
  GATE_TYPE_CONST,
  GATE_TYPE_LABELS,
  GATE_TYPE_TOGGLE,
} from "@/lib/constants";

interface PropertiesPanelProps {
  comp: ComponentInstance;
  onUpdate: (id: string, patch: Partial<ComponentInstance>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function PropertiesPanel({
  comp,
  onUpdate,
  onDelete,
  onDuplicate,
}: PropertiesPanelProps) {
  const gate = GATES[comp.type];

  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        <Settings2 className="h-3.5 w-3.5" /> Properties
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground mb-1">
            Type
          </div>
          <div className="text-sm font-mono text-primary">
            {fm(GATE_TYPE_LABELS[gate.type]?.messageKey)}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">
            Label
          </label>
          <Input
            value={comp.label ?? ""}
            onChange={(e) => onUpdate(comp.id, { label: e.target.value })}
            className="h-8 mt-1 bg-background/60"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              X
            </label>
            <Input
              type="number"
              value={comp.x}
              onChange={(e) => onUpdate(comp.id, { x: Number(e.target.value) })}
              className="h-8 mt-1 bg-background/60"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              Y
            </label>
            <Input
              type="number"
              value={comp.y}
              onChange={(e) => onUpdate(comp.id, { y: Number(e.target.value) })}
              className="h-8 mt-1 bg-background/60"
            />
          </div>
        </div>
        {comp.type === GATE_TYPE_TOGGLE || comp.type === GATE_TYPE_CONST ? (
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              State
            </label>
            <button
              onClick={() =>
                onUpdate(comp.id, {
                  state: { ...(comp.state ?? {}), on: !comp.state?.on },
                })
              }
              className={cn(
                "mt-1 w-full h-8 rounded-md border text-xs font-mono transition-colors",
                comp.state?.on
                  ? "bg-signal-on/20 border-signal-on text-signal-on signal-glow"
                  : "bg-background/60 border-border text-muted-foreground",
              )}
            >
              {comp.state?.on ? "HIGH (1)" : "LOW (0)"}
            </button>
          </div>
        ) : (
          <div>
            <div className="text-[10px] uppercase text-muted-foreground mb-1">
              Live Outputs
            </div>
            <div className="flex gap-1 flex-wrap">
              {comp.outputs.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                comp.outputs.map((o, i) => (
                  <span
                    key={i}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono border",
                      o
                        ? "bg-signal-on/20 border-signal-on text-signal-on"
                        : "bg-secondary border-border text-muted-foreground",
                    )}
                  >
                    {i}: {o ? "1" : "0"}
                  </span>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={onDuplicate}
            className="flex-1 h-8 gap-1"
          >
            <Copy className="h-3 w-3" /> Duplicate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="flex-1 h-8 gap-1 hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(PropertiesPanel);
