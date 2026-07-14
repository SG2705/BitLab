import React, { memo } from "react";
import { cn } from "@/lib/utils";

interface BottomBarProps {
  running: boolean;
  tick: number;
  compCount: number;
  wireCount: number;
}

function BottomBar({ running, tick, compCount, wireCount }: BottomBarProps) {
  return (
    <div className="h-6 shrink-0 border-t border-border bg-panel/80 flex items-center gap-4 px-3 text-[11px] text-muted-foreground font-mono">
      <span className="flex items-center gap-1">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            running ? "bg-signal-on" : "bg-muted-foreground/40",
          )}
        />
        {running ? "Running" : "Idle"}
      </span>
      <span>Tick {tick}</span>
      <span>{compCount} components</span>
      <span>{wireCount} wires</span>
      <span className="ml-auto">Digital Gate v2.0 · Event-Driven</span>
    </div>
  );
}

export default memo(BottomBar);
