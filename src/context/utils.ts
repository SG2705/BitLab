/**
 * Settings store — external store pattern with useSyncExternalStore.
 *
 * No React provider needed. Settings are global, persisted to localStorage,
 * and CSS variables are applied immediately on change.
 */

import { useSyncExternalStore } from "react";

import { VERSION } from "@/engine/constants";
import { GRID, THEME } from "@/lib/constants";
import { type Theme } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  grid: number;
  wireGlow: number;
  compGlow: number;
  gridColor: string;
  theme: Theme;
}

export type SettingsPatch = Partial<AppSettings>;

// ── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = `bitlab-settings-v${VERSION}`;

const DEFAULT_SETTINGS: AppSettings = {
  grid: GRID,
  wireGlow: 1,
  compGlow: 1,
  gridColor: "",
  theme: THEME.DARK,
};

// ── Internal state ───────────────────────────────────────────────────────────

let state: AppSettings = { ...DEFAULT_SETTINGS };
const listeners = new Set<() => void>();

// Load from localStorage on module init
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;

      state = { ...state, ...parsed };
    }
  } catch {
    // corrupt storage — use defaults
  }
}

// ── Side effects ─────────────────────────────────────────────────────────────

function applyCssVars(): void {
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

function applyTheme(): void {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle(
    "light",
    state.theme === THEME.LIGHT,
  );
  document.documentElement.classList.toggle("dark", state.theme === THEME.DARK);
}

function applyAll(): void {
  applyCssVars();
  applyTheme();
}

// Apply on initial load
if (typeof window !== "undefined") applyAll();

// ── Store ────────────────────────────────────────────────────────────────────

export const settingsStore = {
  get: (): AppSettings => state,

  set: (partial: SettingsPatch): void => {
    state = { ...state, ...partial };

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
    } catch {
      // localStorage unavailable
    }

    applyAll();
    listeners.forEach((l) => l());
  },

  reset: (): void => {
    settingsStore.set(DEFAULT_SETTINGS);
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

// ── React hook ───────────────────────────────────────────────────────────────

/** Subscribe to the settings store from React components. */
export function useSettings(): AppSettings {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.get,
    settingsStore.get,
  );
}

// ── Convenience getters ──────────────────────────────────────────────────────

export const getGridSize = (): number => {
  return state.grid;
};

export const getTheme = (): Theme => {
  return state.theme;
};
