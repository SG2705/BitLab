import { useState } from "react";
import { Terminal, AlertTriangle, Activity, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CircuitSnapshot, SimulationStats } from "@/engine";

export interface LogEntry {
  t: number;
  kind: "log" | "warn" | "err";
  msg: string;
}

type ConsoleTab = "log" | "err" | "warn" | "timeline" | "perf";

interface PerfCardProps {
  label: string;
  value: string | number;
}

function PerfCard({ label, value }: PerfCardProps) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

interface ConsolePanelProps {
  tab: ConsoleTab;
  setTab: (t: ConsoleTab) => void;
  logs: LogEntry[];
  tick: number;
  running: boolean;
  snapshot: CircuitSnapshot;
  stats: SimulationStats;
}

export function ConsolePanel({
  tab,
  setTab,
  logs,
  tick,
  running: _running,
  snapshot,
  stats,
}: ConsolePanelProps) {
  const [open, setOpen] = useState(true);
  const tabs = [
    { id: "log" as ConsoleTab, label: "Simulation Log", icon: Terminal },
    { id: "err" as ConsoleTab, label: "Errors", icon: AlertTriangle },
    { id: "warn" as ConsoleTab, label: "Warnings", icon: AlertTriangle },
    { id: "timeline" as ConsoleTab, label: "Event Timeline", icon: Activity },
    { id: "perf" as ConsoleTab, label: "Performance", icon: Cpu },
  ];
  const filtered =
    tab === "err"
      ? logs.filter((l) => l.kind === "err")
      : tab === "warn"
        ? logs.filter((l) => l.kind === "warn")
        : logs;

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-panel/80 transition-all",
        open ? "h-48" : "h-8",
      )}
    >
      <div className="h-8 flex items-center gap-1 px-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setOpen(true);
            }}
            className={cn(
              "h-7 px-2.5 text-xs rounded flex items-center gap-1.5 transition-colors",
              tab === t.id && open
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
        <button
          onClick={() => setOpen(!open)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground px-2"
        >
          {open ? "▼" : "▲"}
        </button>
      </div>
      {open && (
        <div className="h-40 overflow-y-auto p-2 font-mono text-[11px]">
          {tab === "perf" ? (
            <div className="grid grid-cols-4 gap-2 text-xs">
              <PerfCard
                label="Components"
                value={Object.keys(snapshot.components).length}
              />
              <PerfCard
                label="Wires"
                value={Object.keys(snapshot.wires).length}
              />
              <PerfCard label="Tick" value={tick} />
              <PerfCard label="Events" value={stats.eventsProcessed} />
            </div>
          ) : tab === "timeline" ? (
            <div className="space-y-1">
              {logs.slice(-20).map((l, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {new Date(l.t).toLocaleTimeString()}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>{l.msg}</span>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground text-center py-6">
              No entries.
            </div>
          ) : (
            filtered.map((l, i) => (
              <div
                key={i}
                className={cn(
                  "py-0.5",
                  l.kind === "err" && "text-destructive",
                  l.kind === "warn" && "text-accent",
                )}
              >
                <span className="text-muted-foreground">
                  [{new Date(l.t).toLocaleTimeString()}]
                </span>{" "}
                {l.msg}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
