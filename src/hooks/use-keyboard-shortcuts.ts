/**
 * useKeyboardShortcuts — centralizes all keyboard event handling for the app.
 */

import { useEffect } from "react";

export interface KeyboardShortcutDeps {
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  duplicateSelected: () => void;
  saveProjectToLocal: () => void;
  toggleCmdOpen: () => void;
  selectAll: () => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  selectionSize: number;
}

/**
 * UseKeyboardShortcuts
 */
export function useKeyboardShortcuts(deps: KeyboardShortcutDeps): void {
  const {
    deleteSelected,
    undo,
    redo,
    duplicateSelected,
    saveProjectToLocal,
    toggleCmdOpen,
    selectAll,
    copySelection,
    pasteClipboard,
    selectionSize,
  } = deps;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;

      const inInput =
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA";

      if (e.key === "Delete" || e.key === "Backspace") {
        if (inInput) return;

        deleteSelected();

        return;
      }

      if (inInput) return;

      e.preventDefault();

      if (meta && e.key.toLowerCase() === "k") toggleCmdOpen();
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) undo();
      if (meta && e.key.toLowerCase() === "d") duplicateSelected();
      if (meta && e.key.toLowerCase() === "s") saveProjectToLocal();
      if (meta && e.key.toLowerCase() === "a") selectAll();

      if (meta && e.key.toLowerCase() === "c" && selectionSize > 0) {
        copySelection();
      }

      if (meta && e.key.toLowerCase() === "v") {
        pasteClipboard();
      }

      if (
        meta &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      )
        redo();
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [
    deleteSelected,
    undo,
    redo,
    duplicateSelected,
    saveProjectToLocal,
    toggleCmdOpen,
    selectAll,
    copySelection,
    pasteClipboard,
    selectionSize,
  ]);
}
