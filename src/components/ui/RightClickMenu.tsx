/* eslint-disable jsx-a11y/no-static-element-interactions */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { ChevronRight, Copy, Pin, PinOff, Replace, Trash2 } from "lucide-react";

import type { ComponentInstance } from "@/engine";
import { getBroadcasterChannels, library } from "@/engine";
import {
  GATE_CATEGORY_INPUT,
  GATE_CATEGORY_OUTPUT,
  GATE_TYPE_BROADCASTER,
  GATE_TYPE_RECEIVER,
  KEY_SEPARATOR,
} from "@/engine/constants";
import { GATES } from "@/lib/circuit";
import { cn, getGateLabel } from "@/lib/utils";

import GATE_ICON, { type GateIcon } from "./GateIcon";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ContextMenuProps {
  x: number;
  y: number;
  comp: ComponentInstance;
  snapshot: { components: Record<string, ComponentInstance> };
  onClose: () => void;
  onPin: () => void;
  onReplace: (type: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdateComponent?: (id: string, patch: Partial<ComponentInstance>) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a signature string for a component definition based on its
 * input count, output count, and flags (bus, sequential, etc.).
 * Two components are "compatible replacements" if they share the same signature.
 */
function signature(type: string): string {
  if (!library.has(type)) return "";

  const def = library.get(type);

  return `${def.inputs}${KEY_SEPARATOR}${def.outputs}${KEY_SEPARATOR}${def.isSequential ? "seq" : "comb"}`;
}

/**
 * Find all component types that are compatible replacements for a given type.
 * "Compatible" means same number of input pins, output pins, and sequential flag.
 * Returns empty for Input/Output category components (not replaceable).
 */
export function findCompatibleReplacements(type: string): Array<{
  type: string;
  label: string;
  symbol?: string;
  category: string;
}> {
  if (!library.has(type)) return [];

  const srcDef = library.get(type);

  // Input and Output category components are not replaceable
  if (
    srcDef.category === GATE_CATEGORY_INPUT ||
    srcDef.category === GATE_CATEGORY_OUTPUT
  ) {
    return [];
  }

  const srcSig = signature(type);
  const results: Array<{
    type: string;
    label: string;
    symbol?: string;
    category: string;
  }> = [];

  for (const cat of library.getCategories()) {
    // Don't offer input/output components as replacements either
    if (cat.name === GATE_CATEGORY_INPUT || cat.name === GATE_CATEGORY_OUTPUT) {
      continue;
    }

    for (const gateType of cat.gates) {
      if (gateType === "---") continue;
      if (gateType === type) continue;
      if (!library.has(gateType)) continue;

      if (signature(gateType) === srcSig) {
        const def = library.get(gateType);

        results.push({
          type: gateType,
          label: def.label,
          symbol: def.symbol,
          category: cat.name,
        });
      }
    }
  }

  return results;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * RightClickMenu
 */
export function RightClickMenu({
  x,
  y,
  comp,
  snapshot,
  onClose,
  onPin,
  onReplace,
  onDuplicate,
  onDelete,
  onUpdateComponent,
}: ContextMenuProps) {
  const intl = useIntl();
  const [subOpen, setSubOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openSub = useCallback(() => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }

    setSubOpen(true);
  }, []);

  const closeSub = useCallback(() => {
    closeTimeout.current = setTimeout(() => {
      setSubOpen(false);
    }, 150);
  }, []);

  const def = library.has(comp.type) ? library.get(comp.type) : null;
  const sig = def ? `${def.inputs} → ${def.outputs}` : "—";

  const options = useMemo(
    () => findCompatibleReplacements(comp.type),
    [comp.type],
  );

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Clamp so the menu doesn't overflow the viewport
  const menuW = 230;
  const menuH = 240;
  const px = Math.min(x, window.innerWidth - menuW - 8);
  const py = Math.min(y, window.innerHeight - menuH - 8);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        onKeyDown={() => {}}
      />

      {/* Menu */}
      <div
        className="fixed z-50 min-w-[220px] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl backdrop-blur-md p-1 text-sm font-display animate-in fade-in-0 zoom-in-95"
        style={{ left: px, top: py }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={() => {}}
      >
        {/* Header */}
        <div className="px-3 py-1.5 border-b border-border/70 mb-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {def ? getGateLabel(def.type, def.label, intl) : comp.type}
          </div>
          {(comp.type === GATE_TYPE_BROADCASTER ||
            comp.type === GATE_TYPE_RECEIVER) && (
            <div className="text-xs font-mono text-primary mt-0.5">
              {(comp.properties?.channel as string) ||
                intl.formatMessage({
                  id: "CXzd0U",
                  defaultMessage: "— no channel —",
                })}
            </div>
          )}
        </div>

        {/* Pin / Unpin */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
          onClick={() => {
            onPin();
            onClose();
          }}
        >
          {comp.pinned ? (
            <PinOff className="w-4 h-4" />
          ) : (
            <Pin className="w-4 h-4" />
          )}
          {comp.pinned
            ? intl.formatMessage({
                id: "Qsx/Dx",
                defaultMessage: "Unpin from canvas",
              })
            : intl.formatMessage({
                id: "KblJz3",
                defaultMessage: "Pin to canvas",
              })}
        </button>

        {/* Replace with → submenu (hidden for Input/Output/Broadcaster/Receiver) */}
        {def &&
          def.category !== GATE_CATEGORY_INPUT &&
          def.category !== GATE_CATEGORY_OUTPUT &&
          comp.type !== GATE_TYPE_BROADCASTER &&
          comp.type !== GATE_TYPE_RECEIVER && (
            <div
              className="relative"
              onMouseEnter={openSub}
              onMouseLeave={closeSub}
            >
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors",
                  options.length === 0 && "opacity-60",
                )}
              >
                <span className="flex items-center gap-2">
                  <Replace className="w-4 h-4" />
                  <FormattedMessage id="WLIag2" defaultMessage="Replace with" />
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Submenu */}
              {subOpen && options.length > 0 && (
                <div
                  className="absolute left-full top-0 ml-1 min-w-[260px] max-h-[340px] overflow-auto rounded-lg border border-border bg-popover shadow-xl p-1"
                  onMouseEnter={openSub}
                  onMouseLeave={closeSub}
                >
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <FormattedMessage
                      id="sdyNn3"
                      defaultMessage="Same I/O signature ({sig})"
                      values={{ sig }}
                    />
                  </div>
                  {options.map((g) => {
                    const IconComponent =
                      GATE_ICON[g.type as unknown as GateIcon];

                    return (
                      <button
                        type="button"
                        key={g.type}
                        className="w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
                        onClick={() => {
                          onReplace(g.type);
                          onClose();
                        }}
                      >
                        <span className="font-mono text-xs w-6 text-center text-muted-foreground">
                          {IconComponent ? (
                            <IconComponent
                              width={15}
                              height={15}
                              stroke="var(--color-foreground)"
                              pointerEvents="none"
                            />
                          ) : (
                            GATES[g.type]?.symbol
                          )}
                        </span>
                        <span>{getGateLabel(g.type, g.label, intl)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty state in submenu */}
              {subOpen && options.length === 0 && (
                <div
                  className="absolute left-full top-0 ml-1 min-w-[200px] rounded-lg border border-border bg-popover shadow-xl p-1"
                  onMouseEnter={openSub}
                  onMouseLeave={closeSub}
                >
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    <FormattedMessage
                      id="tWxqSS"
                      defaultMessage="No compatible gates available"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Receiver: Channel selection submenu */}
        {comp.type === GATE_TYPE_RECEIVER && onUpdateComponent && (
          <div
            className="relative"
            onMouseEnter={openSub}
            onMouseLeave={closeSub}
          >
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2">
                <Replace className="w-4 h-4" />
                {intl.formatMessage({
                  id: "/Ry3cR",
                  defaultMessage: "Select Channel",
                })}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {subOpen && (
              <div
                className="absolute left-full top-0 ml-1 min-w-[200px] max-h-[340px] overflow-auto rounded-lg border border-border bg-popover shadow-xl p-1"
                onMouseEnter={openSub}
                onMouseLeave={closeSub}
              >
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <FormattedMessage
                    id="sWf4Ru"
                    defaultMessage="Available Channels"
                  />
                </div>
                {(() => {
                  const channels = Array.from(
                    getBroadcasterChannels(snapshot.components).keys(),
                  );
                  const currentChannel =
                    (comp.properties?.channel as string) ?? "";

                  if (channels.length === 0) {
                    return (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        <FormattedMessage
                          id="aVd0Px"
                          defaultMessage="No broadcasters in circuit"
                        />
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* None option */}
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors",
                          !currentChannel && "bg-secondary",
                        )}
                        onClick={() => {
                          onUpdateComponent(comp.id, {
                            properties: {
                              ...(comp.properties ?? {}),
                              channel: "",
                            },
                            label: undefined,
                          });
                          onClose();
                        }}
                      >
                        <span className="text-xs text-muted-foreground">
                          <FormattedMessage
                            id="eOJyfZ"
                            defaultMessage="— None —"
                          />
                        </span>
                      </button>
                      {channels.map((ch) => (
                        <button
                          type="button"
                          key={ch}
                          className={cn(
                            "w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-secondary transition-colors",
                            ch === currentChannel && "bg-secondary",
                          )}
                          onClick={() => {
                            onUpdateComponent(comp.id, {
                              properties: {
                                ...(comp.properties ?? {}),
                                channel: ch,
                              },
                              label: ch,
                            });
                            onClose();
                          }}
                        >
                          <span className="font-mono text-xs">
                            <FormattedMessage id="rOIb4Q" defaultMessage="📡" />
                          </span>
                          <span>{ch}</span>
                          {ch === currentChannel && (
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              <FormattedMessage
                                id="gbNumd"
                                defaultMessage="✓"
                              />
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        <div className="h-px bg-border/70 my-1" />

        {/* Duplicate */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
          onClick={() => {
            onDuplicate();
            onClose();
          }}
        >
          <Copy className="w-4 h-4" />
          &nbsp;
          <FormattedMessage id="4fHiNl" defaultMessage="Duplicate" />
        </button>

        {/* Delete */}
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-destructive/20 text-destructive transition-colors"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          <Trash2 className="w-4 h-4" />
          &nbsp;
          <FormattedMessage id="K3r6DQ" defaultMessage="Delete" />
        </button>
      </div>
    </>
  );
}

RightClickMenu.defaultProps = {
  onUpdateComponent: undefined,
};

export default RightClickMenu;
