import { memo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import type { CircuitSnapshot } from "@/engine";
import { GATE_TYPE_JUNCTION } from "@/engine/constants";
import type { ObstacleMap, RoutingMetrics } from "@/wirerouter";

interface ObstacleMapInfoProps {
  obstacleMap: ObstacleMap;
  /** Routing metrics from WireRouter */
  routingMetrics?: RoutingMetrics;
  /** Circuit snapshot for component/wire counts */
  snapshot?: CircuitSnapshot;
  /** Incremented when the obstacle map is rebuilt, to break memoization */
  // eslint-disable-next-line react/no-unused-prop-types
  version: number;
}

ObstacleMapInfo.defaultProps = {
  routingMetrics: undefined,
  snapshot: undefined,
};

/**
 * ObstacleMapInfo — Shows grid parameters, statistics, and routing metrics
 * when the obstacle map overlay is active.
 */
function ObstacleMapInfo({
  obstacleMap,
  routingMetrics,
  snapshot,
}: ObstacleMapInfoProps) {
  const intl = useIntl();
  const config = obstacleMap.getConfig();
  const { cols, rows } = obstacleMap.getGridSize();
  const obstacles = obstacleMap.getObstacles();
  const stats = obstacleMap.getStats();

  // Circuit counts
  const components = snapshot ? Object.values(snapshot.components) : [];
  const totalComponents = components.length;
  const totalJunctions = components.filter(
    (c) => c.type === GATE_TYPE_JUNCTION,
  ).length;
  const totalWires = snapshot ? Object.keys(snapshot.wires).length : 0;

  return (
    <div className="absolute z-20 top-14 left-3 glass-panel rounded-lg p-2.5 shadow-lg text-xs font-mono text-muted-foreground space-y-1 min-w-[210px] max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="text-foreground font-semibold text-[11px] uppercase tracking-wide mb-1.5">
        <FormattedMessage id="D7q1FU" defaultMessage="Obstacle Map" />
      </div>

      {/* Grid info */}
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="HzfrYu" defaultMessage="Grid" />
        </span>
        <span className="text-foreground">
          <FormattedMessage
            id="h9w0Wr"
            defaultMessage="{cols} x {rows}"
            values={{ cols, rows }}
          />
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="5w6Utj" defaultMessage="Cell Size" />
        </span>
        <span className="text-foreground">
          {intl.formatMessage(
            { id: "Y8CDfa", defaultMessage: "{size}px" },
            { size: config.cellSize },
          )}
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="7LHMo9" defaultMessage="Padding" />
        </span>
        <span className="text-foreground">
          {intl.formatMessage(
            { id: "2yUX2y", defaultMessage: "{count} cells" },
            { count: config.obstaclePadding },
          )}
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="df8eFS" defaultMessage="Stub length" />
        </span>
        <span className="text-foreground">
          {intl.formatMessage(
            { id: "GnlDF5", defaultMessage: "{stub} cells" },
            { stub: config.stubLength },
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

      {/* Map Statistics */}
      <div className="text-foreground font-semibold text-[10px] uppercase tracking-wide mb-1">
        <FormattedMessage id="H3eDAS" defaultMessage="Statistics" />
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="d+zNU8" defaultMessage="Obstacles" />
        </span>
        <span className="text-foreground">{obstacles.length}</span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="qUJTsT" defaultMessage="Blocked" />
        </span>
        <span className="text-foreground">
          <FormattedMessage
            id="IIrG75"
            defaultMessage="{blockedCells} x ({blockedPercent}%)"
            values={{
              blockedCells: stats.blockedCells,
              blockedPercent: stats.blockedPercent.toFixed(1),
            }}
          />
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="MhbcVF" defaultMessage="Padded" />
        </span>
        <span className="text-foreground">
          <FormattedMessage
            id="9rxlkO"
            defaultMessage="{paddedCells} x ({paddedPercent}%)"
            values={{
              paddedCells: stats.paddedCells,
              paddedPercent: stats.paddedPercent.toFixed(1),
            }}
          />
        </span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="tf1lIh" defaultMessage="Free" />
        </span>
        <span className="text-foreground">{stats.freeCells}</span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="4fnB4S" defaultMessage="Build Time" />
        </span>
        <span className="text-foreground">
          <FormattedMessage
            id="DgJW5Q"
            defaultMessage="{buildTimeMs}ms"
            values={{
              buildTimeMs: stats.buildTimeMs.toFixed(1),
            }}
          />
        </span>
      </div>

      <div className="w-full h-px bg-border my-1" />

      {/* Circuit counts */}
      <div className="text-foreground font-semibold text-[10px] uppercase tracking-wide mb-1">
        <FormattedMessage id="AfJBvt" defaultMessage="Circuit" />
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="AcAA5x" defaultMessage="Components" />
        </span>
        <span className="text-foreground">{totalComponents}</span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="GRfNdy" defaultMessage="Junctions" />
        </span>
        <span className="text-foreground">{totalJunctions}</span>
      </div>
      <div className="flex justify-between">
        <span>
          <FormattedMessage id="0X2/qr" defaultMessage="Wires" />
        </span>
        <span className="text-foreground">{totalWires}</span>
      </div>

      {/* Routing Metrics */}
      {routingMetrics && (
        <>
          <div className="w-full h-px bg-border my-1" />
          <div className="text-foreground font-semibold text-[10px] uppercase tracking-wide mb-1">
            <FormattedMessage id="kxSfEi" defaultMessage="Routing" />
          </div>
          <div className="flex justify-between">
            <span>
              <FormattedMessage id="gkDS3C" defaultMessage="Cache Size" />
            </span>
            <span className="text-foreground">{routingMetrics.cacheSize}</span>
          </div>
          <div className="flex justify-between">
            <span>
              <FormattedMessage id="WUXuuR" defaultMessage="Hit Rate" />
            </span>
            <span className="text-foreground">
              <FormattedMessage
                id="aA2vDh"
                defaultMessage="{hitRate}%"
                values={{
                  hitRate: (routingMetrics.hitRate * 100).toFixed(0),
                }}
              />
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              <FormattedMessage id="FtvuNH" defaultMessage="Hits / Misses" />
            </span>
            <span className="text-foreground">
              <FormattedMessage
                id="mYWIlF"
                defaultMessage="{cacheHits} / {cacheMisses}"
                values={{
                  cacheHits: routingMetrics.cacheHits,
                  cacheMisses: routingMetrics.cacheMisses,
                }}
              />
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              <FormattedMessage id="bwdpnY" defaultMessage="Reroutes" />
            </span>
            <span className="text-foreground">{routingMetrics.reroutes}</span>
          </div>
          <div className="flex justify-between">
            <span>
              <FormattedMessage id="8MxVYV" defaultMessage="Avg Time" />
            </span>
            <span className="text-foreground">
              <FormattedMessage
                id="9t9RtV"
                defaultMessage="{avgRoutingTimeMs}ms"
                values={{
                  avgRoutingTimeMs: routingMetrics.avgRoutingTimeMs.toFixed(2),
                }}
              />
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              <FormattedMessage id="kgLyso" defaultMessage="Total Time" />
            </span>
            <span className="text-foreground">
              <FormattedMessage
                id="GXQJBb"
                defaultMessage="{totalRoutingTimeMs}ms"
                values={{
                  totalRoutingTimeMs:
                    routingMetrics.totalRoutingTimeMs.toFixed(1),
                }}
              />
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              <FormattedMessage id="3zydi4" defaultMessage="Topo Ver." />
            </span>
            <span className="text-foreground">
              {routingMetrics.topologyVersion}
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              <FormattedMessage id="PqSVOB" defaultMessage="Config Ver." />
            </span>
            <span className="text-foreground">
              {routingMetrics.configVersion}
            </span>
          </div>
        </>
      )}

      <div className="w-full h-px bg-border my-1" />

      {/* Legend */}
      <div className="flex items-center gap-2">
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
