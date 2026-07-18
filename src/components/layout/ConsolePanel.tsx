import { memo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Activity, AlertTriangle, Cpu, Terminal } from "lucide-react";

import type { CircuitSnapshot, SimulationStats } from "@/engine";
import { CONSOLE_TAB } from "@/lib/constants";
import { type ConsoleTab, type LogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  snapshot: CircuitSnapshot;
  stats: SimulationStats;
}

function ConsolePanel({
  tab,
  setTab,
  logs,
  tick,
  snapshot,
  stats,
}: ConsolePanelProps) {
  const [open, setOpen] = useState(true);

  const tabs = [
    {
      id: CONSOLE_TAB.LOG,
      label: "Simulation Log",
      icon: Terminal,
    },
    {
      id: CONSOLE_TAB.ERROR,
      label: "Errors",
      icon: AlertTriangle,
    },
    {
      id: CONSOLE_TAB.WARN,
      label: "Warnings",
      icon: AlertTriangle,
    },
    { id: CONSOLE_TAB.TIMELINE, label: "Event Timeline", icon: Activity },
    { id: CONSOLE_TAB.PERF, label: "Performance", icon: Cpu },
  ];

  const getFiltered = () => {
    if (tab === CONSOLE_TAB.ERROR) {
      return logs.filter((l) => l.kind === CONSOLE_TAB.ERROR);
    }

    if (tab === CONSOLE_TAB.WARN) {
      return logs.filter((l) => l.kind === CONSOLE_TAB.WARN);
    }

    return logs;
  };

  const renderTabs = (tabId: ConsoleTab) => {
    const filtered = getFiltered();

    if (tabId === CONSOLE_TAB.PERF) {
      return (
        <div className="grid grid-cols-4 gap-2 text-xs">
          <PerfCard
            label="Components"
            value={Object.keys(snapshot.components).length}
          />
          <PerfCard label="Wires" value={Object.keys(snapshot.wires).length} />
          <PerfCard label="Tick" value={tick} />
          <PerfCard label="Events" value={stats.eventsProcessed} />
        </div>
      );
    }

    if (tabId === CONSOLE_TAB.TIMELINE) {
      return (
        <div className="space-y-1">
          {logs.slice(-20).map((l, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="flex items-center gap-2">
              <span className="text-muted-foreground">
                <FormattedMessage
                  id="CxgWOn"
                  defaultMessage="[{time}]"
                  values={{
                    time: new Date(l.t).toLocaleTimeString(),
                  }}
                />
              </span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="text-muted-foreground text-center py-6">
          <FormattedMessage id="l10dAY" defaultMessage=" No entries" />
        </div>
      );
    }

    return filtered.map((l, i) => (
      <div
        // eslint-disable-next-line react/no-array-index-key
        key={i}
        className={cn(
          "py-0.5",
          l.kind === CONSOLE_TAB.ERROR && "text-destructive",
          l.kind === CONSOLE_TAB.WARN && "text-accent",
        )}
      >
        <span className="text-muted-foreground">
          <FormattedMessage
            id="CxgWOn"
            defaultMessage="[{time}]"
            values={{
              time: new Date(l.t).toLocaleTimeString(),
            }}
          />
        </span>
        &nbsp;
        {l.msg}
      </div>
    ));
  };

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
            type="button"
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

        {/* Signal state legend */}
        <div className="flex items-center gap-2 ml-auto mr-2">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-on" />
            <FormattedMessage id="Tf9Oo0" defaultMessage="1" />
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-off" />

            <FormattedMessage id="MbygIJ" defaultMessage="0" />
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-unknown" />

            <FormattedMessage id="MXPwVk" defaultMessage="X" />
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-highz" />
            <FormattedMessage id="MiXf8H" defaultMessage="Z" />
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs text-muted-foreground hover:text-foreground px-2"
        >
          {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
          {open ? "▼" : "▲"}
        </button>
      </div>
      {open && (
        <div className="h-40 overflow-y-auto p-2 font-mono text-[11px]">
          {renderTabs(tab)}
        </div>
      )}
    </div>
  );
}

export default memo(ConsolePanel);
