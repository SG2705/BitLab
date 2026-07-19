import React, { memo, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  Package,
  Search,
  Upload,
} from "lucide-react";

import { GateChip, Input } from "@/components/ui";
import type { CircuitSnapshot } from "@/engine";
import { library } from "@/engine";
import { GATE_CATEGORY_CUSTOM, GATE_SEPARATOR } from "@/engine/constants";
import { GATE_CATEGORY_LABELS } from "@/lib/constants";
import { fm, getGateLabel } from "@/lib/utils";

interface CategoryPanelProps {
  /** Triggers drag-and-drop of a gate type onto the canvas */
  onDragStart: (type: string) => void;
  /** Remove a custom gate from the library */
  onRemoveCustom: (type: string) => void;
  /** Inspect a custom gate's internal circuit */
  onInspectCustom: (name: string, circuit: CircuitSnapshot) => void;
  /** Bump counter to force re-render when custom gates change */
  customBump?: number;
}

CategoryPanel.defaultProps = {
  customBump: 0,
};

function CategoryPanel({
  onDragStart,
  onRemoveCustom,
  onInspectCustom,
  customBump = 0,
}: CategoryPanelProps) {
  const [search, setSearch] = useState("");
  // All categories open by default — only explicitly closed ones are false
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const liveGateCategories = useMemo(() => {
    const cats = library.getCategories();
    const hasCustom = cats.some((c) => c.name === GATE_CATEGORY_CUSTOM);

    if (!hasCustom) {
      cats.push({ name: GATE_CATEGORY_CUSTOM, gates: [] });
    }

    return cats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customBump]);

  const filteredCats = useMemo(() => {
    if (!search) return liveGateCategories;

    const q = search.toLowerCase();

    return liveGateCategories
      .map((c) => ({
        ...c,
        gates: c.gates.filter(
          (g) =>
            (library.has(g) &&
              getGateLabel(g, library.get(g).label)
                .toLowerCase()
                .includes(q)) ||
            g.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.gates.length);
  }, [search, liveGateCategories]);

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-panel/60 flex flex-col">
      {/* Component Search */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          <Cpu className="h-3.5 w-3.5" />
          <FormattedMessage id="AcAA5x" defaultMessage="Components" />
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-7 h-8 bg-background/60 text-sm"
          />
        </div>
      </div>

      {/* Component categories */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredCats.map((cat) => (
          <div key={cat.name}>
            <button
              type="button"
              onClick={() =>
                setOpenCats((o) => ({
                  ...o,
                  [cat.name]: o[cat.name] === false,
                }))
              }
              className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
            >
              {openCats[cat.name] !== false ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {GATE_CATEGORY_LABELS[cat.name]
                ? fm(GATE_CATEGORY_LABELS[cat.name].messageKey)
                : cat.name}
            </button>
            {openCats[cat.name] !== false && (
              <div className="grid grid-cols-2 gap-1.5 px-1 pb-2">
                {cat.gates.map((g, idx) =>
                  g === GATE_SEPARATOR ? (
                    <hr
                      // eslint-disable-next-line react/no-array-index-key
                      key={`sep-${idx}`}
                      className="col-span-2 border-border my-1"
                    />
                  ) : (
                    <GateChip
                      key={g}
                      type={g}
                      onDragStart={() => onDragStart(g)}
                      isCustom={library.isCustom(g)}
                      onRemove={() => onRemoveCustom(g)}
                      onInspect={
                        library.isCustom(g)
                          ? () => {
                              const meta = library.getCustomMeta(g);

                              if (meta)
                                onInspectCustom(meta.name, meta.circuit);
                            }
                          : undefined
                      }
                    />
                  ),
                )}
                {cat.name === GATE_CATEGORY_CUSTOM &&
                  cat.gates.length === 0 && (
                    <div className="col-span-2 text-[10.5px] text-muted-foreground/80 border border-dashed border-border rounded-md p-2 leading-snug">
                      <FormattedMessage
                        id="BRqTi+"
                        defaultMessage="Build a circuit, add Toggle/Button inputs and LED outputs, then click {save} to save it as a reusable gate — or {upload} to import a .json file."
                        values={{
                          save: <Package className="h-3 w-3 inline -mt-0.5" />,
                          upload: <Upload className="h-3 w-3 inline -mt-0.5" />,
                        }}
                      />
                    </div>
                  )}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

export default memo(CategoryPanel);
