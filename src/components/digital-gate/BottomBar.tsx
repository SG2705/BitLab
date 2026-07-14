import { memo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { VERSION } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BottomBarProps {
  running: boolean;
  tick: number;
  compCount: number;
  wireCount: number;
}

function BottomBar({ running, tick, compCount, wireCount }: BottomBarProps) {
  const intl = useIntl();

  return (
    <div className="h-6 shrink-0 border-t border-border bg-panel/80 flex items-center gap-4 px-3 text-[11px] text-muted-foreground font-mono">
      <span className="flex items-center gap-1">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            running ? "bg-signal-on" : "bg-muted-foreground/40",
          )}
        />
        {running
          ? intl.formatMessage({ id: "nDyaq/", defaultMessage: "Running" })
          : intl.formatMessage({ id: "sNY4nx", defaultMessage: "Idle" })}
      </span>
      <span>
        <FormattedMessage
          id="p+mBVZ"
          defaultMessage="Tick {count}"
          values={{ count: tick }}
        />
      </span>
      <span>
        <FormattedMessage
          id="1iDGfg"
          defaultMessage="{count} components"
          values={{ count: compCount }}
        />
      </span>
      <span>
        <FormattedMessage
          id="eVwJCE"
          defaultMessage="{count} wires"
          values={{ count: wireCount }}
        />
      </span>
      <span className="ml-auto">
        <FormattedMessage
          id="73Dt+K"
          defaultMessage="BitLab v{version} · Event-Driven"
          values={{ version: VERSION }}
        />
      </span>
    </div>
  );
}

export default memo(BottomBar);
