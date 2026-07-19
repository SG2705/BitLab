/**
 * SettingsContext — re-exports from the settings store.
 *
 * The store uses useSyncExternalStore (no Provider needed).
 * This file exists for backward compatibility and clean import paths.
 */

export {
  type AppSettings,
  getGridSize,
  getTheme,
  type SettingsPatch,
  settingsStore,
  useSettings,
} from "./utils";
