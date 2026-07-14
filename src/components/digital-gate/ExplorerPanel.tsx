import { memo } from "react";
import { FormattedMessage } from "react-intl";
import { Cpu } from "lucide-react";

import type { CircuitSnapshot, ComponentInstance } from "@/engine";
import { GATES } from "@/lib/circuit";
import { cn } from "@/lib/utils";

interface ExplorerPanelProps {
  snapshot: CircuitSnapshot;
  selection: Set<string>;
  setSelection: (s: Set<string>) => void;
}

function ExplorerPanel({
  snapshot,
  selection,
  setSelection,
}: ExplorerPanelProps) {
  const groups: Record<string, ComponentInstance[]> = {};

  for (const c of Object.values(snapshot.components)) {
    const cat = GATES[c.type]?.category ?? "Other";

    (groups[cat] ||= []).push(c);
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        <Cpu className="h-3.5 w-3.5" />
        <FormattedMessage id="lS7pBq" defaultMessage="Circuit Explorer" />
      </div>
      {Object.keys(groups).length === 0 && (
        <div className="text-xs text-muted-foreground py-4 text-center">
          <FormattedMessage id="HCR858" defaultMessage="Empty circuit." />
        </div>
      )}
      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat} className="mb-2">
          <div className="text-[10px] uppercase text-muted-foreground py-1">
            <FormattedMessage
              id="sqjS0A"
              defaultMessage="{cat} · {length}"
              values={{
                cat,
                length: list.length,
              }}
            />
          </div>
          <div className="space-y-0.5">
            {list.map((c) => (
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
                  {GATES[c.type]?.symbol}
                </span>
                <span className="truncate">
                  {c.label ?? GATES[c.type]?.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(ExplorerPanel);
