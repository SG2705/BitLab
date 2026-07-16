import { FormattedMessage, useIntl } from "react-intl";
import { Package } from "lucide-react";

import { GATE_ICON, type GateIcon } from "@/components/ui";
import { library } from "@/engine";
import { cn } from "@/lib/utils";

interface GateChipProps {
  type: string;
  onDragStart: () => void;
  isCustom?: boolean;
  onRemove?: () => void;
}

GateChip.defaultProps = {
  isCustom: false,
  onRemove: undefined,
};

/**
 * GateChip
 */
function GateChip({ type, onDragStart, isCustom, onRemove }: GateChipProps) {
  const intl = useIntl();
  const def = library.has(type) ? library.get(type) : null;

  if (!def) return null;

  const IconComponent = GATE_ICON[def.type as GateIcon];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/gate", type);
        onDragStart();
      }}
      className={cn(
        "group relative cursor-grab active:cursor-grabbing rounded-md border bg-card/60 hover:bg-card px-2 py-2 text-xs transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col items-center gap-1",
        isCustom
          ? "border-accent/60 hover:border-accent"
          : "border-border hover:border-primary/60",
      )}
      title={
        // eslint-disable-next-line formatjs/no-literal-string-in-jsx
        isCustom ? `${def.label} · ${def.inputs}→${def.outputs}` : def.label
      }
    >
      {isCustom && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();

            // eslint-disable-next-line no-alert
            if (window.confirm(`Remove custom gate "${def.label}"?`))
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
          (def.symbol ?? def.label.slice(0, 4))
        )}
      </div>
      <div className="text-[10px] text-muted-foreground group-hover:text-foreground truncate w-full text-center">
        {isCustom ? (
          <>
            <Package className="inline h-2.5 w-2.5 -mt-0.5 mr-0.5" />
            {def.label}
          </>
        ) : (
          def.label
        )}
      </div>
    </div>
  );
}

export default GateChip;
