/**
 * Settings Store — zustand store with localStorage persistence.
 *
 * Global app settings (theme, glow, grid color) persisted to localStorage.
 * CSS variables and theme class are applied as side effects on change.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { VERSION } from "@/engine/constants";
import { THEME } from "@/lib/constants";
import { type Theme } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  wireGlow: number;
  compGlow: number;
  gridColor: string;
  theme: Theme;
}

export type SettingsPatch = Partial<AppSettings>;

export interface SettingsActions {
  set: (patch: SettingsPatch) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  reset: () => void;
}

export type SettingsStore = AppSettings & SettingsActions;

// ── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = `bitlab-settings-v${VERSION}`;

const DEFAULT_SETTINGS: AppSettings = {
  wireGlow: 1,
  compGlow: 1,
  gridColor: "",
  theme: THEME.DARK,
};

// ── Side effects ─────────────────────────────────────────────────────────────

function applyCssVars(state: AppSettings): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  root.style.setProperty("--wire-glow-intensity", String(state.wireGlow));
  root.style.setProperty("--comp-glow-intensity", String(state.compGlow));

  if (state.gridColor) {
    root.style.setProperty("--color-grid", state.gridColor);
  } else {
    root.style.removeProperty("--color-grid");
  }
}

function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("light", theme === THEME.LIGHT);
  document.documentElement.classList.toggle("dark", theme === THEME.DARK);
}

function applyAll(state: AppSettings): void {
  applyCssVars(state);
  applyTheme(state.theme);
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      set: (patch) => {
        set(patch);
        applyAll({ ...get(), ...patch });
      },

      setTheme: (theme) => {
        set({ theme });
        applyAll({ ...get(), theme });
      },

      toggleTheme: () => {
        const next = get().theme === THEME.DARK ? THEME.LIGHT : THEME.DARK;

        set({ theme: next });
        applyAll({ ...get(), theme: next });
      },

      reset: () => {
        set(DEFAULT_SETTINGS);
        applyAll(DEFAULT_SETTINGS);
      },
    }),
    {
      name: SETTINGS_KEY,
      partialize: (state) => ({
        wireGlow: state.wireGlow,
        compGlow: state.compGlow,
        gridColor: state.gridColor,
        theme: state.theme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyAll(state);
      },
    },
  ),
);

// ── Convenience hooks ────────────────────────────────────────────────────────

/** Subscribe to all settings values (backward-compatible) */
export function useSettings(): AppSettings {
  const wireGlow = useSettingsStore((s) => s.wireGlow);
  const compGlow = useSettingsStore((s) => s.compGlow);
  const gridColor = useSettingsStore((s) => s.gridColor);
  const theme = useSettingsStore((s) => s.theme);

  return { wireGlow, compGlow, gridColor, theme };
}

/** Subscribe to theme only */
export const useTheme = () => useSettingsStore((s) => s.theme);

// ── Non-reactive accessors (for use outside React) ───────────────────────────

/** Legacy settingsStore object for non-hook usage */
export const settingsStore = {
  get: (): AppSettings => {
    const s = useSettingsStore.getState();

    return {
      wireGlow: s.wireGlow,
      compGlow: s.compGlow,
      gridColor: s.gridColor,
      theme: s.theme,
    };
  },
  set: (patch: SettingsPatch): void => {
    useSettingsStore.getState().set(patch);
  },
  reset: (): void => {
    useSettingsStore.getState().reset();
  },
};

/** Get current theme (non-reactive) */
export const getTheme = (): Theme => useSettingsStore.getState().theme;

// Apply on initial load
if (typeof window !== "undefined") {
  applyAll(useSettingsStore.getState());
}
