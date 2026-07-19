/**
 * Settings context utilities — persistence, side effects, and constants.
 */

import { GRID, THEME } from "@/lib/constants";
import { type Theme } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  grid: number;
  wireGlow: number;
  compGlow: number;
  theme: Theme;
}

export type SettingsPatch = Partial<AppSettings>;
export type SettingsAction =
  SettingsPatch | ((state: AppSettings) => SettingsPatch);

// ── Constants ────────────────────────────────────────────────────────────────

export const SETTINGS_KEY = "bitlab-settings";

export const DEFAULT_SETTINGS: AppSettings = {
  grid: GRID,
  wireGlow: 1,
  compGlow: 1,
  theme: THEME.DARK,
};

// ── Persistence helpers ──────────────────────────────────────────────────────

export const loadFromStorage = (): AppSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);

    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<AppSettings>;

    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveToStorage = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // localStorage unavailable
  }
};

// ── Side effects ─────────────────────────────────────────────────────────────

/** Apply glow intensity CSS variables to the document root */
export const applyGlowSettings = (wireGlow: number, compGlow: number): void => {
  const root = document.documentElement;

  root.style.setProperty("--wire-glow-intensity", String(wireGlow));
  root.style.setProperty("--comp-glow-intensity", String(compGlow));
};

/** Apply theme classes to document */
export const applyTheme = (theme: Theme): void => {
  document.documentElement.classList.toggle("light", theme === THEME.LIGHT);
  document.documentElement.classList.toggle("dark", theme === THEME.DARK);
};

// ── Reducer ──────────────────────────────────────────────────────────────────

export const settingsReducer = (
  state: AppSettings,
  action: SettingsAction,
): AppSettings => {
  const patch = typeof action === "function" ? action(state) : action;

  return { ...state, ...patch };
};

// ── Action creators ──────────────────────────────────────────────────────────

export const SettingsActions = {
  setGrid: (grid: number): SettingsPatch => ({ grid }),
  setWireGlow: (wireGlow: number): SettingsPatch => ({ wireGlow }),
  setCompGlow: (compGlow: number): SettingsPatch => ({ compGlow }),
  setTheme: (theme: Theme): SettingsPatch => ({ theme }),
  toggleTheme: (state: AppSettings): SettingsPatch => ({
    theme: state.theme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
  }),
};
