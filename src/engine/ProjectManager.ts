/**
 * ProjectManager — undo/redo history, save/load, and serialization.
 *
 * History is a stack of immutable CircuitSnapshot objects.
 * Each structural change (add, remove, move-committed) pushes a new entry.
 * Live drag-moves do NOT push history — only the final position on mouse-up.
 *
 * Serialization format:
 *   JSON with a `version` field for future migration support.
 *
 * Future:
 *   • IndexedDB persistence (stub interface provided)
 *   • Cloud sync (stub interface provided)
 */

import type { CircuitManager } from "./CircuitManager";
import { CURR_CIR_KEY, MAX_HISTORY, VERSION } from "./constants";
import type { CircuitSnapshot } from "./types";

export interface SerializedProject {
  version: number;
  name: string;
  savedAt: number;
  circuit: CircuitSnapshot;
}

/** Migrate older project formats to the current schema */
const migrate = (project: SerializedProject): SerializedProject => {
  if (project.version === VERSION) return project;

  // Future migration logic goes here
  return { ...project, version: VERSION };
};

// ── Class ────────────────────────────────────────────────────────────────────

export class ProjectManager {
  private history: CircuitSnapshot[] = [];
  private historyIndex = -1;
  private projectName = "Untitled";

  constructor(private readonly manager: CircuitManager) {
    // Capture initial empty state
    this.push(manager.getSnapshot());
  }

  // ── History ───────────────────────────────────────────────────────────────

  /**
   * Record the current circuit state. Call this after every structural change
   * that should be undoable (component add/remove, wire add/remove, committed
   * moves, label edits, etc.).
   */
  push(snapshot?: CircuitSnapshot): void {
    const snap = snapshot ?? this.manager.getSnapshot();
    // Truncate redo branch

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(structuredClone(snap));

    if (this.history.length > MAX_HISTORY) this.history.shift();

    this.historyIndex = this.history.length - 1;
  }

  undo(): boolean {
    if (!this.canUndo()) return false;

    this.historyIndex -= 1;
    this.manager.loadSnapshot(structuredClone(this.history[this.historyIndex]));

    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    this.historyIndex += 1;
    this.manager.loadSnapshot(structuredClone(this.history[this.historyIndex]));

    return true;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  saveToLocalStorage(name?: string): void {
    const project: SerializedProject = {
      version: VERSION,
      name: name ?? this.projectName,
      savedAt: Date.now(),
      circuit: this.manager.getSnapshot(),
    };

    localStorage.setItem(CURR_CIR_KEY, JSON.stringify(project));

    if (name) this.projectName = name;
  }

  loadFromLocalStorage(): boolean {
    const raw = localStorage.getItem(CURR_CIR_KEY);

    if (!raw) return false;

    try {
      const project = JSON.parse(raw) as SerializedProject;
      const migrated = migrate(project);

      this.projectName = migrated.name;
      this.manager.loadSnapshot(migrated.circuit);
      this.push();

      return true;
    } catch {
      return false;
    }
  }

  exportJSON(): string {
    const project: SerializedProject = {
      version: VERSION,
      name: this.projectName,
      savedAt: Date.now(),
      circuit: this.manager.getSnapshot(),
    };

    return JSON.stringify(project, null, 2);
  }

  importJSON(json: string): void {
    const parsed: unknown = JSON.parse(json);

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Unrecognized JSON format");
    }

    const obj = parsed as Record<string, unknown>;

    // Support both formats:
    // 1. Full project: { version, name, circuit: { components, wires } }
    // 2. Raw circuit snapshot: { components, wires }
    if (obj.circuit && obj.version !== undefined) {
      const project = obj as unknown as SerializedProject;
      const migrated = migrate(project);

      this.projectName = migrated.name;
      this.manager.loadSnapshot(migrated.circuit);
    } else if (obj.components) {
      // Raw CircuitSnapshot
      this.manager.loadSnapshot(obj as unknown as CircuitSnapshot);
    } else {
      throw new Error("Unrecognized JSON format");
    }

    this.push();
  }

  /** Trigger a file-download of the current circuit as JSON */
  downloadJSON(filename?: string): void {
    const blob = new Blob([this.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download =
      filename ?? `${this.projectName.replace(/\s+/g, "-")}.bitlab.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  /** Trigger a file-input dialog and import the selected JSON */
  async importFromFile(): Promise<boolean> {
    return new Promise((resolve) => {
      const input = document.createElement("input");

      input.type = "file";
      input.accept = ".json,.bitlab.json,.circuit.json,.dgate.json";

      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (!file) {
          resolve(false);

          return;
        }

        const reader = new FileReader();

        reader.onload = (ev) => {
          try {
            this.importJSON(ev.target?.result as string);

            resolve(true);
          } catch {
            resolve(false);
          }
        };

        reader.readAsText(file);
      };

      input.click();
    });
  }

  newProject(name = "Untitled"): void {
    this.projectName = name;
    this.history = [];
    this.historyIndex = -1;
    this.manager.loadSnapshot({ components: {}, wires: {} });
    this.push();
  }

  getProjectName(): string {
    return this.projectName;
  }

  setProjectName(name: string): void {
    this.projectName = name;
  }
}
