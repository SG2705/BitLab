import { FormattedMessage, useIntl } from "react-intl";
import { Eye, Package } from "lucide-react";

import { GATE_ICON, type GateIcon } from "@/components/ui";
import { library } from "@/engine";
import { cn, getGateLabel } from "@/lib/utils";

interface GateChipProps {
  type: string;
  onDragStart: () => void;
  isCustom?: boolean;
  onRemove?: () => void;
  onInspect?: () => void;
}

GateChip.defaultProps = {
  isCustom: false,
  onRemove: undefined,
  onInspect: undefined,
};

/**
 * GateChip
 */
function GateChip({
  type,
  onDragStart,
  isCustom,
  onRemove,
  onInspect,
}: GateChipProps) {
  const intl = useIntl();
  const def = library.has(type) ? library.get(type) : null;

  if (!def) return null;

  const IconComponent = GATE_ICON[def.type as GateIcon];
  const resolvedLabel = getGateLabel(def.type, def.label, intl);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/gate", type);
        // Suppress default browser drag ghost image
        const emptyImg = new Image();

        emptyImg.src =
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        e.dataTransfer.setDragImage(emptyImg, 0, 0);
        onDragStart();
      }}
      className={cn(
        "group relative cursor-grab active:cursor-grabbing rounded-md border bg-card/60 hover:bg-card px-2 py-2 text-xs transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col items-center gap-1",
        isCustom
          ? "border-accent/60 hover:border-accent"
          : "border-border hover:border-primary/60",
      )}
      title={
        isCustom
          ? intl.formatMessage(
              {
                id: "yjnzeu",
                defaultMessage: "{resolvedLabel} · {ipc}→{opc}",
              },
              {
                resolvedLabel,
                ipc: def.inputs,
                opc: def.outputs,
              },
            )
          : resolvedLabel
      }
    >
      {isCustom && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();

            // eslint-disable-next-line no-alert
            if (window.confirm(`Remove custom gate "${resolvedLabel}"?`))
              onRemove();
          }}
          className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] leading-none shadow"
          title={intl.formatMessage({
            id: "xissZQ",
            defaultMessage: "Remove this custom circuit",
          })}
        >
          <FormattedMessage id="MXPwVk" defaultMessage="X" />
        </button>
      )}
      {isCustom && onInspect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
          className="absolute -top-1 -left-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] leading-none shadow"
          title={intl.formatMessage({
            id: "OdPyqE",
            defaultMessage: "View internal circuit",
          })}
        >
          <Eye className="h-2.5 w-2.5" />
        </button>
      )}
      <div
        className={cn(
          "h-8 w-full flex items-center justify-center rounded bg-background/60 border border-border/60 font-mono text-[13px] group-hover:signal-glow truncate px-1",
          isCustom ? "text-accent" : "text-primary",
        )}
      >
        {IconComponent ? (
          <IconComponent
            width={20}
            height={20}
            stroke="var(--color-foreground)"
            pointerEvents="none"
          />
        ) : (
          (def.symbol ?? resolvedLabel.slice(0, 4))
        )}
      </div>
      <div className="text-[10px] text-muted-foreground group-hover:text-foreground truncate w-full text-center">
        {isCustom ? (
          <>
            <Package className="inline h-2.5 w-2.5 -mt-0.5 mr-0.5" />
            {resolvedLabel}
          </>
        ) : (
          resolvedLabel
        )}
      </div>
    </div>
  );
}

export default GateChip;
