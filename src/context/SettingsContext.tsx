/**
 * SettingsContext — global app settings managed via a reducer pattern.
 *
 * Provides:
 *   - Persisted settings (localStorage)
 *   - CSS variable application for glow intensities
 *   - Theme management
 *   - Grid size configuration
 *
 * Usage:
 *   Wrap your app with <SettingsProvider>, then consume via:
 *     useSettings()        — full { state, dispatch }
 *     useSettingsState()   — state only
 *     useSettingsDispatch() — dispatch only
 */

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import {
  applyGlowSettings,
  applyTheme,
  type AppSettings,
  loadFromStorage,
  saveToStorage,
  type SettingsAction,
  settingsReducer,
} from "./utils";

// Re-export types and actions for consumers
export type { AppSettings, SettingsAction, SettingsPatch } from "./utils";
export { SettingsActions } from "./utils";
export { applyGlowSettings } from "./utils";

// ── Context ──────────────────────────────────────────────────────────────────

const SettingsContext = createContext<
  | {
      state: AppSettings;
      dispatch: React.Dispatch<SettingsAction>;
    }
  | undefined
>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

/**
 * Provides settings context to the app tree.
 * Loads settings from localStorage on mount, applies CSS variables and theme.
 * Persists and applies side effects on every state change.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    settingsReducer,
    undefined,
    loadFromStorage,
  );

  // Apply side effects whenever state changes
  useEffect(() => {
    applyGlowSettings(state.wireGlow, state.compGlow);
    applyTheme(state.theme);
    saveToStorage(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Returns the full settings context (state + dispatch).
 * Must be used within a SettingsProvider.
 */
export function useSettings() {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
}

/** Returns the settings state only. */
export function useSettingsState(): AppSettings {
  const { state } = useSettings();

  return state;
}

/** Returns the dispatch function only. */
export function useSettingsDispatch(): React.Dispatch<SettingsAction> {
  const { dispatch } = useSettings();

  return dispatch;
}
