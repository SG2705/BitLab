/* eslint-disable jsx-a11y/label-has-associated-control */
import { memo, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Copy, Settings2, Trash2 } from "lucide-react";

import { Button, Input } from "@/components/ui";
import { type ComponentInstance, library } from "@/engine";
import {
  GATE_TYPE_CONST,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_TOGGLE,
} from "@/engine/constants";
import {} from "@/lib/constants";
import { cn, getGateLabel } from "@/lib/utils";

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
  const intl = useIntl();
  const [labelValue, setLabelValue] = useState(comp.label ?? "");

  useEffect(() => {
    setLabelValue(comp.label ?? "");
  }, [comp.id, comp.label]);

  if (!library.has(comp.type)) return null;

  const gate = library.get(comp.type);

  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        <Settings2 className="h-3.5 w-3.5" />
        <FormattedMessage id="aI80kg" defaultMessage="Properties" />
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground mb-1">
            <FormattedMessage id="+U6ozc" defaultMessage="Type" />
          </div>
          <div className="text-sm font-mono text-primary">
            {getGateLabel(gate.type, gate.label, intl)}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground">
            <FormattedMessage id="753yX5" defaultMessage="Label" />
          </label>
          <Input
            value={labelValue}
            placeholder={
              gate.isInput || gate.isClock ? "e.g. CLK, A, EN…" : undefined
            }
            onChange={(e) => {
              setLabelValue(e.target.value);
              onUpdate(comp.id, { label: e.target.value });
            }}
            className="h-8 mt-1 bg-background/60"
          />
          {(gate.isInput || gate.isClock) && (
            <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
              <FormattedMessage
                id="IRAMdG"
                defaultMessage="Used as pin name when saved as a custom circuit"
              />
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              <FormattedMessage id="MXPwVk" defaultMessage="X" />
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
              <FormattedMessage id="SSHeHt" defaultMessage="Y" />
            </label>
            <Input
              type="number"
              value={comp.y}
              onChange={(e) => onUpdate(comp.id, { y: Number(e.target.value) })}
              className="h-8 mt-1 bg-background/60"
            />
          </div>
        </div>
        {!gate.isAnnotation && comp.type === GATE_TYPE_DIGIT_BIN && (
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              <FormattedMessage id="Gab3IF" defaultMessage="Digit (0-9)" />
            </label>
            <Input
              type="number"
              min={0}
              max={9}
              value={(comp.state?.digit as number) ?? 0}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                const digit = !Number.isNaN(v) && v >= 0 && v <= 9 ? v : 0;

                onUpdate(comp.id, { state: { ...comp.state, digit } });
              }}
              className="h-8 mt-1 bg-background/60"
            />
          </div>
        )}
        {!gate.isAnnotation &&
          comp.type !== GATE_TYPE_DIGIT_BIN &&
          (comp.type === GATE_TYPE_TOGGLE || comp.type === GATE_TYPE_CONST ? (
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">
                <FormattedMessage id="ku+mDU" defaultMessage="State" />
              </label>
              <button
                type="button"
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
                {comp.state?.on
                  ? intl.formatMessage({
                      id: "97i0f9",
                      defaultMessage: "HIGH (1)",
                    })
                  : intl.formatMessage({
                      id: "e+L5nJ",
                      defaultMessage: "LOW (0)",
                    })}
              </button>
            </div>
          ) : (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">
                <FormattedMessage id="iiWNbN" defaultMessage="Live Outputs" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {comp.outputs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    <FormattedMessage id="SL+c5a" defaultMessage="—" />
                  </span>
                ) : (
                  comp.outputs.map((o, i) => (
                    <span
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono border",
                        o
                          ? "bg-signal-on/20 border-signal-on text-signal-on"
                          : "bg-secondary border-border text-muted-foreground",
                      )}
                    >
                      <FormattedMessage
                        id="+qEqKV"
                        defaultMessage="{i}: {o}"
                        values={{
                          i,
                          o: o ? "1" : "0",
                        }}
                      />
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={onDuplicate}
            className="flex-1 h-8 gap-1"
          >
            <Copy className="h-3 w-3" />
            <FormattedMessage id="4fHiNl" defaultMessage="Duplicate" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDelete}
            className="flex-1 h-8 gap-1 hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-3 w-3" />
            <FormattedMessage id="K3r6DQ" defaultMessage="Delete" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default memo(PropertiesPanel);
