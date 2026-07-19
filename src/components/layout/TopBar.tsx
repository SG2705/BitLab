import { Fragment, memo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Clock,
  Command,
  FolderOpen,
  Package,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Settings,
  Square,
  StepForward,
  Undo2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui";

interface TopBarProps {
  isRunning: boolean;
  setisRunning: (r: boolean) => void;
  stepOnce: () => void;
  resetSim: () => void;
  tick: number;
  clockSpeed: number;
  setClockSpeed: (s: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  openSettings: () => void;
  saveProjectToLocal: () => void;
  loadProjectFromLocal: () => void;
  exportProject: () => void;
  importToCanvas: () => void;
  newProject: () => void;
  openCmd: () => void;
  importCircuit: () => void;
  createCircuitFromGates: () => void;
  hasComponents: boolean;
}

interface TBBtnProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  isDisabled?: boolean;
}

TBBtn.defaultProps = {
  isDisabled: false,
};

function TBBtn({ onClick, icon, label, isDisabled }: TBBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      title={label}
      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {icon}
    </button>
  );
}

function TopBar({
  isRunning,
  setisRunning,
  stepOnce,
  resetSim,
  tick,
  clockSpeed,
  setClockSpeed,
  undo,
  redo,
  canUndo,
  canRedo,
  openSettings,
  saveProjectToLocal,
  loadProjectFromLocal,
  exportProject,
  importToCanvas,
  newProject,
  openCmd,
  createCircuitFromGates,
  importCircuit,
  hasComponents,
}: TopBarProps) {
  const intl = useIntl();

  return (
    <header className="h-12 shrink-0 border-b border-border bg-panel/80 backdrop-blur flex items-center gap-2 px-3">
      <div className="flex items-center gap-2 mr-2">
        <img
          src="/logo.png"
          alt={intl.formatMessage({ id: "SbT8HW", defaultMessage: "BitLab" })}
          className="h-7 w-7 rounded-lg object-contain"
        />
        <div className="font-bold tracking-tight">
          <FormattedMessage id="SbT8HW" defaultMessage="BitLab" />
        </div>
      </div>
      <div className="w-px h-6 bg-border" />
      <TBBtn
        onClick={newProject}
        icon={<Plus className="h-4 w-4" />}
        label="New"
      />
      <TBBtn
        onClick={loadProjectFromLocal}
        icon={<FolderOpen className="h-4 w-4" />}
        label="Open from local"
      />
      <TBBtn
        onClick={saveProjectToLocal}
        icon={<Save className="h-4 w-4" />}
        label="Save to local"
      />
      <TBBtn
        onClick={exportProject}
        icon={<Save className="h-4 w-4 rotate-180" />}
        label="Export"
      />
      <TBBtn
        onClick={importToCanvas}
        icon={<FolderOpen className="h-4 w-4" />}
        label="Import circuit to canvas"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <TBBtn
        onClick={createCircuitFromGates}
        icon={<Package className="h-4 w-4" />}
        label="Save current circuit as reusable"
      />
      <TBBtn
        onClick={importCircuit}
        icon={<Upload className="h-4 w-4" />}
        label="Import circuit from file"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <TBBtn
        onClick={undo}
        isDisabled={!canUndo}
        icon={<Undo2 className="h-4 w-4" />}
        label="Undo"
      />
      <TBBtn
        onClick={redo}
        isDisabled={!canRedo}
        icon={<Redo2 className="h-4 w-4" />}
        label="Redo"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        size="sm"
        variant={isRunning ? "secondary" : "default"}
        onClick={() => setisRunning(!isRunning)}
        disabled={!hasComponents}
        className="h-8 gap-1.5"
      >
        {isRunning ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {isRunning
          ? intl.formatMessage({ id: "tFFMkF", defaultMessage: "Pause" })
          : intl.formatMessage({ id: "KiXNvz", defaultMessage: "Run" })}
      </Button>
      <TBBtn
        onClick={() => setisRunning(false)}
        isDisabled={!isRunning || !hasComponents}
        icon={<Square className="h-4 w-4" />}
        label="Stop"
      />
      <TBBtn
        onClick={stepOnce}
        isDisabled={!hasComponents || isRunning}
        icon={<StepForward className="h-4 w-4" />}
        label="Step"
      />
      <TBBtn
        onClick={resetSim}
        isDisabled={!hasComponents}
        icon={<RotateCcw className="h-4 w-4" />}
        label="Reset"
      />
      <div
        className={`flex items-center gap-2 ml-3 pl-3 border-l border-border ${!hasComponents ? "opacity-40 pointer-events-none" : ""}`}
      >
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="range"
          min={1}
          max={10}
          value={clockSpeed}
          onChange={(e) => setClockSpeed(Number(e.target.value))}
          disabled={!hasComponents}
          className="w-24 accent-primary"
        />
        <span className="text-xs text-muted-foreground font-mono tabular-nums w-12">
          <FormattedMessage
            id="4TCm1M"
            defaultMessage="{clockSpeed} Hz"
            values={{ clockSpeed }}
          />
        </span>
      </div>
      <div className="text-xs text-muted-foreground font-mono ml-3 flex items-center">
        <FormattedMessage id="p7+Jxw" defaultMessage="Tick" />
        &nbsp;
        <span className="text-foreground tabular-nums">{tick}</span>
        &nbsp; &nbsp;
        {isRunning ? (
          <div
            className="sqaurewavebox"
            style={
              {
                "--wave-duration": `${(2 / clockSpeed).toFixed(3)}s`,
              } as React.CSSProperties
            }
          >
            {Array.from({ length: 6 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <Fragment key={i}>
                <div className="bottomwave" />
                <div className="verticalwave" />
                <div className="topwave" />
                <div className="verticalwave" />
              </Fragment>
            ))}
          </div>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <TBBtn
          onClick={openSettings}
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
        />
        <button
          type="button"
          onClick={openCmd}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border border-border bg-background/40 hover:bg-secondary transition-colors text-muted-foreground"
        >
          <Command className="h-3 w-3" />
          <FormattedMessage id="wgnt2g" defaultMessage="Palette " />
          &nbsp;
          <kbd className="ml-1 px-1 py-0.5 text-[10px] rounded bg-secondary border border-border">
            <FormattedMessage id="cpOWpz" defaultMessage="⌘K" />
          </kbd>
        </button>
      </div>
    </header>
  );
}

export default memo(TopBar);
