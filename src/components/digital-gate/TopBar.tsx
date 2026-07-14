import {
  Play,
  Pause,
  Square,
  StepForward,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Plus,
  Clock,
  Command,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Theme } from "@/lib/types";
import { memo } from "react";
import { THEME } from "@/lib/constants";

interface TopBarProps {
  running: boolean;
  setRunning: (r: boolean) => void;
  stepOnce: () => void;
  resetSim: () => void;
  tick: number;
  clockSpeed: number;
  setClockSpeed: (s: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  theme: Theme;
  setTheme: (t: Theme) => void;
  saveProjectToLocal: () => void;
  loadProjectFromLocal: () => void;
  exportProject: () => void;
  newProject: () => void;
  openCmd: () => void;
}

interface TBBtnProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}

function TBBtn({ onClick, icon, label, disabled }: TBBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {icon}
    </button>
  );
}

function TopBar({
  running,
  setRunning,
  stepOnce,
  resetSim,
  tick,
  clockSpeed,
  setClockSpeed,
  undo,
  redo,
  canUndo,
  canRedo,
  theme,
  setTheme,
  saveProjectToLocal,
  loadProjectFromLocal,
  exportProject,
  newProject,
  openCmd,
}: TopBarProps) {
  return (
    <header className="h-12 shrink-0 border-b border-border bg-panel/80 backdrop-blur flex items-center gap-2 px-3">
      <div className="flex items-center gap-2 mr-2">
        <img
          src="/logo.png"
          alt="BitLab"
          className="h-7 w-7 rounded-lg object-contain"
        />
        <div className="font-bold tracking-tight">BitLab</div>
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
      <div className="w-px h-6 bg-border mx-1" />
      <TBBtn
        onClick={undo}
        disabled={!canUndo}
        icon={<Undo2 className="h-4 w-4" />}
        label="Undo"
      />
      <TBBtn
        onClick={redo}
        disabled={!canRedo}
        icon={<Redo2 className="h-4 w-4" />}
        label="Redo"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        size="sm"
        variant={running ? "secondary" : "default"}
        onClick={() => setRunning(!running)}
        className="h-8 gap-1.5"
      >
        {running ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {running ? "Pause" : "Run"}
      </Button>
      <TBBtn
        onClick={() => setRunning(false)}
        icon={<Square className="h-4 w-4" />}
        label="Stop"
      />
      <TBBtn
        onClick={stepOnce}
        icon={<StepForward className="h-4 w-4" />}
        label="Step"
      />
      <TBBtn
        onClick={resetSim}
        icon={<RotateCcw className="h-4 w-4" />}
        label="Reset"
      />
      <div className="flex items-center gap-2 ml-3 pl-3 border-l border-border">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="range"
          min={1}
          max={30}
          value={clockSpeed}
          onChange={(e) => setClockSpeed(Number(e.target.value))}
          className="w-24 accent-primary"
        />
        <span className="text-xs text-muted-foreground font-mono tabular-nums w-12">
          {clockSpeed} Hz
        </span>
      </div>
      <div className="text-xs text-muted-foreground font-mono ml-3">
        Tick <span className="text-foreground tabular-nums">{tick}</span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={openCmd}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border border-border bg-background/40 hover:bg-secondary transition-colors text-muted-foreground"
        >
          <Command className="h-3 w-3" /> Palette
          <kbd className="ml-1 px-1 py-0.5 text-[10px] rounded bg-secondary border border-border">
            ⌘K
          </kbd>
        </button>
        <TBBtn
          onClick={() =>
            setTheme(theme === THEME.DARK ? THEME.LIGHT : THEME.DARK)
          }
          icon={
            theme === THEME.DARK ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )
          }
          label="Theme"
        />
      </div>
    </header>
  );
}

export default memo(TopBar);
