import { memo, useState } from "react";
import {
  Frame,
  Moon,
  Palette as PaletteIcon,
  RotateCcw,
  Sun,
  X,
} from "lucide-react";

import { settingsStore, useSettings } from "@/context/SettingsContext";
import { THEME } from "@/lib/constants";
import { type Theme } from "@/lib/types";
import { cn } from "@/lib/utils";

const SETTINGS_CATEGORY = {
  CANVAS: "canvas",
  THEME: "theme",
} as const;

type Category = (typeof SETTINGS_CATEGORY)[keyof typeof SETTINGS_CATEGORY];

interface SettingsPanelProps {
  onClose: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

function SettingsPanel({ onClose, theme, setTheme }: SettingsPanelProps) {
  const settings = useSettings();
  const [cat, setCat] = useState<Category>(SETTINGS_CATEGORY.CANVAS);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/60 backdrop-blur-sm p-4"
      role="presentation"
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full max-w-3xl h-[520px] rounded-xl border border-border bg-panel/95 shadow-2xl flex overflow-hidden animate-scale-in"
      >
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r border-border bg-background/40 p-3 flex flex-col">
          {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 px-2">
            Settings
          </div>
          <SideItem
            active={cat === SETTINGS_CATEGORY.CANVAS}
            onClick={() => setCat(SETTINGS_CATEGORY.CANVAS)}
            icon={<Frame className="h-4 w-4" />}
            label="Canvas"
          />
          <SideItem
            active={cat === SETTINGS_CATEGORY.THEME}
            onClick={() => setCat(SETTINGS_CATEGORY.THEME)}
            icon={<PaletteIcon className="h-4 w-4" />}
            label="Theme"
          />
          <div className="mt-auto pt-2">
            <button
              type="button"
              onClick={() => settingsStore.reset()}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
              <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 shrink-0 border-b border-border flex items-center justify-between px-4">
            <div className="font-semibold tracking-tight">
              {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
              {cat === SETTINGS_CATEGORY.CANVAS ? "Canvas" : "Theme"}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {cat === SETTINGS_CATEGORY.CANVAS && (
              <>
                <SliderRow
                  label="Grid size"
                  desc="Spacing of the canvas grid dots and component snap step."
                  min={5}
                  max={40}
                  step={5}
                  value={settings.grid}
                  unit="px"
                  onChange={(v) => settingsStore.set({ grid: v })}
                />
                <SliderRow
                  label="Wire glow"
                  desc="Halo intensity of energized wires."
                  min={0}
                  max={3}
                  step={0.1}
                  value={settings.wireGlow}
                  unit="x"
                  onChange={(v) => settingsStore.set({ wireGlow: v })}
                />
                <SliderRow
                  label="Component glow"
                  desc="Halo intensity on active components."
                  min={0}
                  max={3}
                  step={0.1}
                  value={settings.compGlow}
                  unit="x"
                  onChange={(v) => settingsStore.set({ compGlow: v })}
                />
              </>
            )}

            {cat === SETTINGS_CATEGORY.THEME && (
              <div>
                {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
                <div className="text-sm font-medium mb-1">Theme</div>
                {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
                <div className="text-xs text-muted-foreground mb-3">
                  Choose the workspace appearance.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ThemeCard
                    active={theme === THEME.DARK}
                    onClick={() => setTheme(THEME.DARK)}
                    icon={<Moon className="h-4 w-4" />}
                    label="Dark"
                    swatches={["#0e1120", "#1a1f36", "#22d3ee", "#e879f9"]}
                  />
                  <ThemeCard
                    active={theme === THEME.LIGHT}
                    onClick={() => setTheme(THEME.LIGHT)}
                    icon={<Sun className="h-4 w-4" />}
                    label="Light"
                    swatches={["#f7f8fc", "#ffffff", "#0891b2", "#c026d3"]}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SideItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
        active
          ? "bg-primary/15 text-foreground border border-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent",
      )}
    >
      {icon}
      {}
      {label}
    </button>
  );
}

function SliderRow({
  label,
  desc,
  min,
  max,
  step,
  value,
  unit,
  onChange,
}: {
  label: string;
  desc: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        {}
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs font-mono tabular-nums text-muted-foreground">
          {}
          {value.toFixed(step < 1 ? 1 : 0)}
          {unit}
        </div>
      </div>
      {}
      <div className="text-xs text-muted-foreground mb-2">{desc}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground/70 mt-1">
        {}
        <span>
          {min}
          {unit}
        </span>
        {}
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

function ThemeCard({
  active,
  onClick,
  icon,
  label,
  swatches,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  swatches: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative rounded-lg border p-4 text-left transition-all",
        active
          ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--color-primary)]"
          : "border-border bg-background/40 hover:border-primary/40",
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center">
          {icon}
        </div>
        {}
        <div className="text-sm font-semibold">{label}</div>
      </div>
      <div className="flex gap-1.5">
        {swatches.map((c) => (
          <div
            key={c}
            className="h-6 flex-1 rounded"
            style={{ background: c }}
          />
        ))}
      </div>
      {active && (
        <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
      )}
    </button>
  );
}

export default memo(SettingsPanel);
