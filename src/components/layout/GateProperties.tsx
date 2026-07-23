/* eslint-disable jsx-a11y/label-has-associated-control */
import { memo, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Copy, RotateCw, Settings2, Trash2 } from "lucide-react";

import { Button, Input } from "@/components/ui";
import {
  type CircuitSnapshot,
  type ComponentInstance,
  getBroadcasterChannels,
  library,
  LogicValue,
} from "@/engine";
import {
  GATE_TYPE_BROADCASTER,
  GATE_TYPE_CONST,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_DISPLAY7,
  GATE_TYPE_PROBE,
  GATE_TYPE_RECEIVER,
  GATE_TYPE_TOGGLE,
} from "@/engine/constants";
import { CELL_SIZE } from "@/globals";
import { cn, getGateLabel } from "@/lib/utils";

interface PropertiesPanelProps {
  comp: ComponentInstance;
  snapshot: CircuitSnapshot;
  onUpdate: (id: string, patch: Partial<ComponentInstance>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function GateProperties({
  comp,
  snapshot,
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
    <div className="p-3 border-b border-border max-h-1/2 overflow-y-auto">
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
        {/* Broadcaster channel name */}
        {comp.type === GATE_TYPE_BROADCASTER && (
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              <FormattedMessage id="hh0xW7" defaultMessage="Channel Name" />
            </label>
            <Input
              value={(comp.properties?.channel as string) ?? ""}
              placeholder="e.g. CLK, DATA..."
              onChange={(e) => {
                const channel = e.target.value;

                onUpdate(comp.id, {
                  properties: { ...(comp.properties ?? {}), channel },
                  label: channel,
                });
              }}
              className="h-8 mt-1 bg-background/60"
            />
            <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
              <FormattedMessage
                id="hgpzgN"
                defaultMessage="Unique name. Receivers subscribe to this channel"
              />
            </p>
          </div>
        )}
        {/* Receiver channel selector */}
        {comp.type === GATE_TYPE_RECEIVER && (
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              <FormattedMessage id="KeO51o" defaultMessage="Channel" />
            </label>
            <select
              value={(comp.properties?.channel as string) ?? ""}
              onChange={(e) => {
                const channel = e.target.value;

                onUpdate(comp.id, {
                  properties: { ...(comp.properties ?? {}), channel },
                  label: channel || undefined,
                });
              }}
              className="w-full h-8 mt-1 rounded-md border border-border bg-background/60 px-2 text-sm"
            >
              <option value="">
                <FormattedMessage id="eOJyfZ" defaultMessage="— None —" />
              </option>
              {Array.from(
                getBroadcasterChannels(snapshot.components).keys(),
              ).map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-muted-foreground mt-1 leading-tight">
              <FormattedMessage
                id="lKPym8"
                defaultMessage="Select a broadcaster to receive its signal"
              />
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              <FormattedMessage id="MXPwVk" defaultMessage="X" />
            </label>
            <Input
              type="number"
              value={comp.x}
              step={CELL_SIZE}
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
              step={CELL_SIZE}
              onChange={(e) => onUpdate(comp.id, { y: Number(e.target.value) })}
              className="h-8 mt-1 bg-background/60"
            />
          </div>
        </div>
        {/* Rotation */}
        {!gate.isAnnotation &&
          comp.type !== GATE_TYPE_PROBE &&
          comp.type !== GATE_TYPE_DISPLAY7 && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">
                <FormattedMessage id="FH7+Uk" defaultMessage="Transform" />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const current = comp.rotation ?? 0;
                    const next = ((current + 90) % 360) as 0 | 90 | 180 | 270;

                    onUpdate(comp.id, { rotation: next });
                  }}
                  title={intl.formatMessage({
                    id: "UoljwI",
                    defaultMessage: "Rotate 90° CW",
                  })}
                  className="flex items-center justify-center h-8 w-8 rounded-md border border-border hover:bg-secondary transition-colors"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-mono text-muted-foreground w-8">
                  <FormattedMessage
                    id="wC1xUk"
                    defaultMessage="{deg}°"
                    values={{ deg: comp.rotation ?? 0 }}
                  />
                </span>
              </div>
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
                <FormattedMessage id="wGeGIk" defaultMessage="Live Inputs" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {comp.inputs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    <FormattedMessage id="SL+c5a" defaultMessage="—" />
                  </span>
                ) : (
                  comp.inputs.map((inp, i) => (
                    <span
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-mono border",
                        inp === LogicValue.ONE
                          ? "bg-signal-on/20 border-signal-on text-signal-on"
                          : inp === LogicValue.UNKNOWN
                            ? "bg-signal-unknown/20 border-signal-unknown text-signal-unknown"
                            : inp === LogicValue.HIGH_IMPEDANCE
                              ? "bg-signal-highz/20 border-signal-highz text-signal-highz"
                              : "bg-secondary border-border text-muted-foreground",
                      )}
                    >
                      <FormattedMessage
                        id="2BUZ/h"
                        defaultMessage="{gateLabel} : {gateState}"
                        values={{
                          gateLabel: gate.inputLabels?.[i] ?? `I${i}`,
                          gateState:
                            inp === LogicValue.ONE
                              ? "1"
                              : inp === LogicValue.UNKNOWN
                                ? "X"
                                : inp === LogicValue.HIGH_IMPEDANCE
                                  ? "Z"
                                  : "0",
                        }}
                      />
                    </span>
                  ))
                )}
              </div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1 mt-2">
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
                        o === LogicValue.ONE
                          ? "bg-signal-on/20 border-signal-on text-signal-on"
                          : o === LogicValue.UNKNOWN
                            ? "bg-signal-unknown/20 border-signal-unknown text-signal-unknown"
                            : o === LogicValue.HIGH_IMPEDANCE
                              ? "bg-signal-highz/20 border-signal-highz text-signal-highz"
                              : "bg-secondary border-border text-muted-foreground",
                      )}
                    >
                      <FormattedMessage
                        id="2BUZ/h"
                        defaultMessage="{gateLabel} : {gateState}"
                        values={{
                          gateLabel: gate.outputLabels?.[i] ?? `O${i}`,
                          gateState:
                            o === LogicValue.ONE
                              ? "1"
                              : o === LogicValue.UNKNOWN
                                ? "X"
                                : o === LogicValue.HIGH_IMPEDANCE
                                  ? "Z"
                                  : "0",
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

export default memo(GateProperties);
