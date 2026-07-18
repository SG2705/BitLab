import { memo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Cable } from "lucide-react";

import { type ComponentInstance, library, LogicValue } from "@/engine";
import type { Wire } from "@/engine/types";
import { cn, resolveLabel } from "@/lib/utils";

interface WirePropertiesProps {
  wire: Wire;
  fromComp: ComponentInstance;
  toComp: ComponentInstance;
}

function WireProperties({ wire, fromComp, toComp }: WirePropertiesProps) {
  const intl = useIntl();

  const fromDef = library.has(fromComp.type)
    ? library.get(fromComp.type)
    : null;
  const toDef = library.has(toComp.type) ? library.get(toComp.type) : null;

  const fromLabel = fromComp.label
    ? resolveLabel(fromComp.label, intl)
    : fromDef
      ? resolveLabel(fromDef.type, intl)
      : fromComp.type;
  const toLabel = toComp.label
    ? resolveLabel(toComp.label, intl)
    : toDef
      ? resolveLabel(toDef.type, intl)
      : toComp.type;

  const fromPinLabel =
    fromDef?.outputLabels?.[wire.from.pin] ?? `O${wire.from.pin}`;
  const toPinLabel = toDef?.inputLabels?.[wire.to.pin] ?? `I${wire.to.pin}`;
  const signal = fromComp.outputs[wire.from.pin] ?? LogicValue.ZERO;
  const isBus = Boolean(fromDef?.isBusOutput) && Boolean(toDef?.isBusInput);

  return (
    <div className="p-3 border-b border-border max-h-1/2 overflow-y-auto">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        <Cable className="h-3.5 w-3.5" />
        <FormattedMessage id="VVkJRv" defaultMessage="Wire" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            <FormattedMessage id="dM+p3/" defaultMessage="From" />
          </span>
          <span className="font-mono">
            <FormattedMessage
              id="gjQsdg"
              defaultMessage="{fromLabel} [{fromPinLabel}]"
              values={{ fromLabel, fromPinLabel }}
            />
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            <FormattedMessage id="9j3hXO" defaultMessage="To" />
          </span>
          <span className="font-mono">
            <FormattedMessage
              id="vSpLrC"
              defaultMessage="{toLabel} [{toPinLabel}]"
              values={{ toLabel, toPinLabel }}
            />
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            <FormattedMessage id="91pVwu" defaultMessage="Signal" />
          </span>
          <span
            className={cn(
              "font-mono",
              signal === LogicValue.ONE
                ? "text-signal-on"
                : signal === LogicValue.UNKNOWN
                  ? "text-signal-unknown"
                  : signal === LogicValue.HIGH_IMPEDANCE
                    ? "text-signal-highz"
                    : "text-muted-foreground",
            )}
          >
            {signal === LogicValue.ONE
              ? intl.formatMessage({
                  id: "97i0f9",
                  defaultMessage: "HIGH (1)",
                })
              : signal === LogicValue.UNKNOWN
                ? intl.formatMessage({
                    id: "k46aB2",
                    defaultMessage: "UNKNOWN (X)",
                  })
                : signal === LogicValue.HIGH_IMPEDANCE
                  ? intl.formatMessage({
                      id: "qNPjsN",
                      defaultMessage: "Hi-Z (Z)",
                    })
                  : intl.formatMessage({
                      id: "e+L5nJ",
                      defaultMessage: "LOW (0)",
                    })}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            <FormattedMessage id="+U6ozc" defaultMessage="Type" />
          </span>
          <span className="font-mono">
            {isBus
              ? intl.formatMessage({
                  id: "QbDcBb",
                  defaultMessage: "Bus",
                })
              : intl.formatMessage({
                  id: "sOyh5x",
                  defaultMessage: "Bit",
                })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default memo(WireProperties);
