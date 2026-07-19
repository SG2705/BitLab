import { memo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import type { ObstacleMap } from "@/wirerouter";

interface ObstacleMapInfoProps {
  obstacleMap: ObstacleMap;
  /** Incremented when the obstacle map is rebuilt, to break memoization */
  // eslint-disable-next-line react/no-unused-prop-types
  version: number;
}

/**
 * ObstacleMapInfo — Shows grid parameters when the obstacle map overlay is active.
 * Positioned below the left canvas toolbar.
 */
function ObstacleMapInfo({ obstacleMap }: ObstacleMapInfoProps) {
  const intl = useIntl();
  const config = obstacleMap.getConfig();
  const { cols, rows } = obstacleMap.getGridSize();
  const obstacles = obstacleMap.getObstacles();

  return (
    <div className="absolute z-20 top-14 left-3 glass-panel rounded-lg p-2.5 shadow-lg text-xs font-mono text-muted-foreground space-y-1 min-w-[180px]">
      <div className="text-foreground font-semibold text-[11px] uppercase tracking-wide mb-1.5">
        <FormattedMessage id="D7q1FU" defaultMessage="Obstacle Map" />
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="HzfrYu" defaultMessage="Grid" />
        </span>
        <span className="text-foreground">
          {cols}&nbsp;
          <FormattedMessage id="MXPwVk" defaultMessage="X" />
          &nbsp;{rows}
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="5w6Utj" defaultMessage="Cell Size" />
        </span>
        <span className="text-foreground">
          {intl.formatMessage(
            {
              id: "Y8CDfa",
              defaultMessage: "{size}px",
            },
            {
              size: config.cellSize,
            },
          )}
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="7LHMo9" defaultMessage="Padding" />
        </span>
        <span className="text-foreground">
          {intl.formatMessage(
            {
              id: "2yUX2y",
              defaultMessage: "{count} cells",
            },
            {
              count: config.obstaclePadding,
            },
          )}
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="df8eFS" defaultMessage="Stub length" />
        </span>
        <span className="text-foreground">
          {intl.formatMessage(
            {
              id: "GnlDF5",
              defaultMessage: "{stub} cells",
            },
            {
              stub: config.stubLength,
            },
          )}
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="zFBwag" defaultMessage="Turn Penalty" />
        </span>
        <span className="text-foreground">{config.turnPenalty}</span>
      </div>
      <div className="w-full h-px bg-border my-1" />
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="d+zNU8" defaultMessage="Obstacles" />
        </span>
        <span className="text-foreground">{obstacles.length}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/50 border border-red-500/70" />
        <span>
          <FormattedMessage id="qUJTsT" defaultMessage="Blocked" />
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400/40 border border-yellow-400/60" />
        <span>
          <FormattedMessage id="MhbcVF" defaultMessage="Padded" />
        </span>
      </div>
    </div>
  );
}

export default memo(ObstacleMapInfo);
