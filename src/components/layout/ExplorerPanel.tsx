import { memo } from "react";
import { FormattedMessage } from "react-intl";
import { Copy, Cpu, RotateCw, Trash2 } from "lucide-react";

import { Button, GATE_ICON, type GateIcon } from "@/components/ui";
import type { CircuitSnapshot, ComponentInstance } from "@/engine";
import { GATES } from "@/lib/circuit";
import { GATE_CATEGORY_LABELS } from "@/lib/constants";
import { cn, fm, getGateLabel, resolveLabel } from "@/lib/utils";

interface ExplorerPanelProps {
  snapshot: CircuitSnapshot;
  selection: Set<string>;
  selWires: Set<string>;
  setSelection: (s: Set<string>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRotate: () => void;
}

function ExplorerPanel({
  snapshot,
  selection,
  selWires,
  setSelection,
  onDuplicate,
  onDelete,
  onRotate,
}: ExplorerPanelProps) {
  const groups: Record<string, ComponentInstance[]> = {};

  for (const c of Object.values(snapshot.components)) {
    const cat = GATES[c.type]?.category ?? "Other";

    (groups[cat] ||= []).push(c);
  }

  const hasMultiSelection = selection.size > 1 || selWires.size > 0;

  return (
    <div className="flex-1 p-3 max-h-1/2 overflow-y-auto">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        <Cpu className="h-3.5 w-3.5" />
        <FormattedMessage id="lS7pBq" defaultMessage="Circuit Explorer" />
      </div>
      {/* Multi-selection actions */}
      {hasMultiSelection && (
        <div className="flex gap-2 mb-3 pb-2 border-b border-border">
          {selection.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDuplicate}
              className="flex-1 h-7 gap-1 text-xs"
            >
              <Copy className="h-3 w-3" />
              <FormattedMessage id="4fHiNl" defaultMessage="Duplicate" />
              {selection.size > 1 && (
                <span className="text-muted-foreground">
                  <FormattedMessage
                    id="6IeE6J"
                    defaultMessage="({s})"
                    values={{
                      s: selection.size,
                    }}
                  />
                </span>
              )}
            </Button>
          )}
          {selection.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRotate}
              className="flex-1 h-7 gap-1 text-xs"
            >
              <RotateCw className="h-3 w-3" />
              <FormattedMessage id="UoljwI" defaultMessage="Rotate 90° CW" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="flex-1 h-7 gap-1 text-xs hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3 w-3" />
            <FormattedMessage id="K3r6DQ" defaultMessage="Delete" />
            <span className="text-muted-foreground">
              <FormattedMessage
                id="6IeE6J"
                defaultMessage="({s})"
                values={{
                  s: selection.size + selWires.size,
                }}
              />
            </span>
          </Button>
        </div>
      )}
      {Object.keys(groups).length === 0 && (
        <div className="text-xs text-muted-foreground py-4 text-center">
          <FormattedMessage id="Tv1nZc" defaultMessage="Empty circuit" />
        </div>
      )}
      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat} className="mb-2">
          <div className="text-[10px] uppercase text-muted-foreground py-1">
            <FormattedMessage
              id="sqjS0A"
              defaultMessage="{cat} · {length}"
              values={{
                cat: GATE_CATEGORY_LABELS[cat]
                  ? fm(GATE_CATEGORY_LABELS[cat].messageKey)
                  : cat,
                length: list.length,
              }}
            />
          </div>
          <div className="space-y-0.5">
            {list.map((c) => {
              const IconComponent = GATE_ICON[c.type as unknown as GateIcon];

              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelection(new Set([c.id]))}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 hover:bg-secondary transition-colors",
                    selection.has(c.id) && "bg-primary/20 text-primary",
                  )}
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {IconComponent ? (
                      <IconComponent
                        width={15}
                        height={15}
                        stroke="var(--color-foreground)"
                        pointerEvents="none"
                      />
                    ) : (
                      GATES[c.type]?.symbol
                    )}
                  </span>
                  <span className="truncate">
                    {resolveLabel(c.label) ||
                      getGateLabel(c.type, GATES[c.type]?.label ?? c.type)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(ExplorerPanel);
