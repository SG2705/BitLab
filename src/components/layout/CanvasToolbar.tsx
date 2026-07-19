import { memo } from "react";
import { FormattedMessage } from "react-intl";
import {
  Activity,
  Grid3x3,
  Hand,
  MousePointer2,
  Route,
  Spline,
} from "lucide-react";

import { ToolBtn } from "@/components/ui";
import { TOOL, WIRE_TYPE } from "@/lib/constants";
import type { Tool, WireType } from "@/lib/types";

interface CanvasToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  wireStyle: WireType;
  setWireStyle: (style: WireType) => void;
  view: { x: number; y: number; k: number };
  setView: (view: { x: number; y: number; k: number }) => void;
  fitToScreen: () => void;
}

function CanvasToolbar({
  tool,
  setTool,
  snapEnabled,
  setSnapEnabled,
  wireStyle,
  setWireStyle,
  view,
  setView,
  fitToScreen,
}: CanvasToolbarProps) {
  return (
    <>
      {/* Canvas tool (left) */}
      <div className="absolute z-20 top-3 left-3 flex items-center gap-1 glass-panel rounded-lg p-1 shadow-lg">
        <ToolBtn
          active={tool === TOOL.SELECT}
          onClick={() => setTool(TOOL.SELECT)}
          icon={<MousePointer2 className="h-4 w-4" />}
          label="Select (V)"
        />
        <ToolBtn
          active={tool === TOOL.PAN}
          onClick={() => setTool(TOOL.PAN)}
          icon={<Hand className="h-4 w-4" />}
          label="Pan (Space)"
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn
          active={snapEnabled}
          onClick={() => setSnapEnabled(!snapEnabled)}
          icon={<Grid3x3 className="h-4 w-4" />}
          label="Snap to grid"
        />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolBtn
          active={wireStyle === WIRE_TYPE.BEZIER}
          onClick={() => setWireStyle(WIRE_TYPE.BEZIER)}
          icon={<Spline className="h-4 w-4" />}
          label="Wire: Bezier"
        />
        <ToolBtn
          active={wireStyle === WIRE_TYPE.ORTHO}
          onClick={() => setWireStyle(WIRE_TYPE.ORTHO)}
          icon={<Activity className="h-4 w-4" />}
          label="Wire: Ortho"
        />
        <ToolBtn
          active={wireStyle === WIRE_TYPE.OPTIMIZED}
          onClick={() => setWireStyle(WIRE_TYPE.OPTIMIZED)}
          icon={<Route className="h-4 w-4" />}
          label="Wire: Optimized"
        />
      </div>

      {/* Canvas fit/zoom (right) */}
      <div className="absolute z-20 top-3 right-3 flex items-center gap-1 glass-panel rounded-lg p-1 text-xs shadow-lg">
        <button
          type="button"
          tabIndex={0}
          onClick={fitToScreen}
          className="px-2 py-1 rounded hover:bg-secondary transition-colors"
        >
          <FormattedMessage id="N2HbmZ" defaultMessage="Fit" />
        </button>
        <button
          type="button"
          tabIndex={0}
          onClick={() => setView({ x: 0, y: 0, k: 1 })}
          className="px-2 py-1 rounded hover:bg-secondary transition-colors"
        >
          <FormattedMessage id="8ZVfG8" defaultMessage="100%" />
        </button>
        <span className="px-2 text-muted-foreground tabular-nums">
          <FormattedMessage
            id="qnonu0"
            defaultMessage="{percentage}%"
            values={{
              percentage: Math.round(view.k * 100),
            }}
          />
        </span>
      </div>
    </>
  );
}

export default memo(CanvasToolbar);
