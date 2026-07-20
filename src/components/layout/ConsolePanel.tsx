import { memo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Activity,
  AlertTriangle,
  Cpu,
  GitBranch,
  Terminal,
} from "lucide-react";

import type { CircuitSnapshot, SimulationStats } from "@/engine";
import { CONSOLE_TAB } from "@/lib/constants";
import { type ConsoleTab, type LogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PerfCardProps {
  label: string;
  value: string | number;
  alert?: boolean;
}

PerfCard.defaultProps = {
  alert: false,
};

function PerfCard({ label, value, alert }: PerfCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card/60 p-2",
        alert ? "border-destructive" : "border-border",
      )}
    >
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-lg font-bold tabular-nums",
          alert && "text-destructive",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** Mini bar chart for evaluations per delta cycle */
function DeltaChart({ evalsPerDelta }: { evalsPerDelta: number[] }) {
  const intl = useIntl();

  if (evalsPerDelta.length === 0) return null;

  const max = Math.max(...evalsPerDelta, 1);
  const barWidth = Math.max(4, Math.min(12, 200 / evalsPerDelta.length));

  return (
    <div className="flex items-end gap-px h-10">
      {evalsPerDelta.map((count, i) => {
        const height = Math.max(2, (count / max) * 36);

        return (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="bg-primary/70 rounded-t-sm"
            style={{ width: barWidth, height }}
            title={intl.formatMessage(
              {
                id: "XH4UaQ",
                defaultMessage: "Delta {index}: {count} evals",
              },
              { index: i + 1, count },
            )}
          />
        );
      })}
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
    { id: CONSOLE_TAB.PROPAGATION, label: "Propagation", icon: GitBranch },
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

    if (tabId === CONSOLE_TAB.PROPAGATION) {
      const prop = stats.propagation;

      if (!prop) {
        return (
          <div className="text-muted-foreground text-center py-6">
            <FormattedMessage
              id="VlBIny"
              defaultMessage="No propagation data yet. Run the simulation or connect wires"
            />
          </div>
        );
      }

      const hasOscillation = prop.oscillatingComponents.length > 0;

      return (
        <div className="space-y-3">
          {/* Metrics cards */}
          <div className="grid grid-cols-6 gap-2 text-xs">
            <PerfCard label="Evaluations" value={prop.evaluations} />
            <PerfCard label="Delta Cycles" value={prop.deltaCycles} />
            <PerfCard
              label="Max Queue"
              value={prop.maxQueueDepth}
              alert={prop.maxQueueDepth > 50}
            />
            <PerfCard label="Skipped" value={prop.skippedEvents} />
            <PerfCard
              label="Duration"
              value={`${prop.durationMs.toFixed(2)}ms`}
            />
            <PerfCard
              label="Oscillation"
              value={hasOscillation ? "YES" : "No"}
              alert={hasOscillation}
            />
          </div>

          {/* Delta cycle bar chart */}
          {prop.evalsPerDelta.length > 0 && (
            <div className="rounded-md border border-border bg-card/40 p-2">
              <div className="text-[10px] uppercase text-muted-foreground mb-1">
                <FormattedMessage
                  id="ge+rKb"
                  defaultMessage="Evaluations per Delta Cycle"
                />
              </div>
              <DeltaChart evalsPerDelta={prop.evalsPerDelta} />
              <div className="text-[9px] text-muted-foreground mt-1">
                <FormattedMessage
                  id="Uwwnd+"
                  defaultMessage="{evalsPerDelta} delta cycles • {maxEvalsPerDelta} max evals/delta"
                  values={{
                    evalsPerDelta: prop.evalsPerDelta.length,
                    maxEvalsPerDelta: Math.max(...prop.evalsPerDelta),
                  }}
                />
              </div>
            </div>
          )}

          {/* Oscillating components warning */}
          {hasOscillation && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs">
              <div className="font-semibold text-destructive mb-1">
                <FormattedMessage
                  id="xxiUbv"
                  defaultMessage="⚠ Oscillation Detected"
                />
              </div>
              <div className="text-muted-foreground">
                <FormattedMessage
                  id="zBHN4g"
                  defaultMessage="Components involved: {comps}"
                  values={{
                    comps: prop.oscillatingComponents
                      .map((id) => {
                        const comp = snapshot.components[id];

                        return comp
                          ? `${comp.label || comp.type} (${id.slice(0, 6)})`
                          : id.slice(0, 8);
                      })
                      .join(", "),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      );
    }

    if (tabId === CONSOLE_TAB.PERF) {
      const hasFaults = stats.faultedComponents.length > 0;

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2 text-xs">
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
            <PerfCard
              label="Faulted"
              value={stats.faultedComponents.length}
              alert={hasFaults}
            />
          </div>

          {/* Faulted components */}
          {hasFaults && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-2 text-xs">
              <div className="font-semibold text-destructive mb-1">
                <FormattedMessage
                  id="6bW0uV"
                  defaultMessage="⚠ Faulted Components"
                />
              </div>
              <div className="space-y-1 text-muted-foreground">
                {stats.recentErrors.map((err, i) => {
                  const comp = snapshot.components[err.compId];
                  const label = comp
                    ? `${comp.label || comp.type}`
                    : err.compId.slice(0, 8);

                  return (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={i} className="flex gap-2">
                      <span className="text-destructive font-mono">
                        {label}
                      </span>
                      <span className="truncate">{err.error}</span>
                      <span className="text-[9px] ml-auto">
                        <FormattedMessage
                          id="IiT0j3"
                          defaultMessage=" t={tick}"
                          values={{ tick: err.tick }}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-off" />
            <FormattedMessage id="V+xjJQ" defaultMessage="LOW" />
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-on" />
            <FormattedMessage id="xsfBZ4" defaultMessage="HIGH" />
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-unknown" />
            <FormattedMessage id="uTM3YG" defaultMessage="UNKNOWN" />
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-highz" />
            <FormattedMessage id="wyLK6M" defaultMessage="HIGH IMPEDENCE" />
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
