/**
 * useClipboard — manages copy/paste/duplicate operations for circuit components.
 */

import { useCallback, useRef } from "react";

export interface ClipboardControls {
  copySelection: (ids: string[]) => void;
  pasteClipboard: (
    duplicateComponents: (ids: string[]) => Map<string, string>,
  ) => Map<string, string> | null;
  hasClipboard: () => boolean;
}

/**
 * UseClipboard
 */
export function useClipboard(): ClipboardControls {
  const clipboardRef = useRef<string[]>([]);

  const copySelection = useCallback((ids: string[]) => {
    clipboardRef.current = ids;
  }, []);

  const pasteClipboard = useCallback(
    (
      duplicateComponents: (ids: string[]) => Map<string, string>,
    ): Map<string, string> | null => {
      if (clipboardRef.current.length === 0) return null;

      const idMap = duplicateComponents(clipboardRef.current);

      // Update clipboard to point to new copies so next paste offsets from these
      clipboardRef.current = Array.from(idMap.values());

      return idMap;
    },
    [],
  );

  const hasClipboard = useCallback(() => clipboardRef.current.length > 0, []);

  return {
    copySelection,
    pasteClipboard,
    hasClipboard,
  };
}
