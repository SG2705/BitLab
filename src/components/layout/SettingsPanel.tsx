import { memo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Moon, Settings, Sun } from "lucide-react";

import {
  SettingsActions,
  useSettingsDispatch,
  useSettingsState,
} from "@/context/SettingsContext";
import { THEME } from "@/lib/constants";

interface SettingsPanelProps {
  onClose: () => void;
}

function SettingsPanel({ onClose }: SettingsPanelProps) {
  const settings = useSettingsState();
  const dispatch = useSettingsDispatch();
  const [activeTab, setActiveTab] = useState<"canvas" | "theme">("canvas");

  return (
    <div
      className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-start justify-center pt-20"
      role="presentation"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="w-[480px] glass-panel rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            <FormattedMessage id="aI80kg" defaultMessage="Properties" />
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("canvas")}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === "canvas"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FormattedMessage id="nBzjeI" defaultMessage="Canvas" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("theme")}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === "theme"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FormattedMessage id="Pe0ogR" defaultMessage="Theme" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-5">
          {activeTab === "canvas" && (
            <>
              {/* Grid size */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FormattedMessage id="F1UWQB" defaultMessage="Grid Size" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={5}
                    max={40}
                    step={5}
                    value={settings.grid}
                    onChange={(e) =>
                      dispatch(SettingsActions.setGrid(Number(e.target.value)))
                    }
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                    {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
                    {settings.grid}px
                  </span>
                </div>
              </div>

              {/* Wire glow intensity */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FormattedMessage id="+3ztvr" defaultMessage="Wire Glow" />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={settings.wireGlow}
                    onChange={(e) =>
                      dispatch(
                        SettingsActions.setWireGlow(Number(e.target.value)),
                      )
                    }
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                    {settings.wireGlow.toFixed(1)}
                  </span>
                </div>
                {/* Preview */}
                <svg className="mt-2 w-full h-6">
                  <line
                    x1="20"
                    y1="12"
                    x2="200"
                    y2="12"
                    stroke="var(--color-signal-on)"
                    strokeWidth={2}
                    className="signal-glow"
                  />
                </svg>
              </div>

              {/* Component glow intensity */}
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <FormattedMessage
                    id="9D02P1"
                    defaultMessage="Component Glow"
                  />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={settings.compGlow}
                    onChange={(e) =>
                      dispatch(
                        SettingsActions.setCompGlow(Number(e.target.value)),
                      )
                    }
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-10 text-right">
                    {settings.compGlow.toFixed(1)}
                  </span>
                </div>
                {/* Preview */}
                <svg className="mt-2 w-full h-8">
                  <rect
                    x="20"
                    y="4"
                    width="60"
                    height="24"
                    rx="4"
                    fill="var(--color-signal-on)"
                    opacity={0.3}
                    stroke="var(--color-signal-on)"
                    strokeWidth={1.5}
                    className="comp-glow"
                  />
                </svg>
              </div>
            </>
          )}

          {activeTab === "theme" && (
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <FormattedMessage id="2GURQY" defaultMessage="Appearance" />
              </div>
              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => dispatch(SettingsActions.setTheme(THEME.DARK))}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                    settings.theme === THEME.DARK
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    dispatch(SettingsActions.setTheme(THEME.LIGHT))
                  }
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors ${
                    settings.theme === THEME.LIGHT
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
                  <span className="text-sm font-medium">Light</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsPanel);
