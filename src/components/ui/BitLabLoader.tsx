interface BitLabLoaderProps {
  message?: string;
}

BitLabLoader.defaultProps = {
  message: "Booting BitLab…",
};

/**
 * BitLabLoader
 */
function BitLabLoader({ message = "Booting BitLab…" }: BitLabLoaderProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      <div className="relative flex items-center justify-center">
        {/* Inner pulsing logo */}
        <img
          src="/logo.png"
          // eslint-disable-next-line formatjs/no-literal-string-in-jsx
          alt="BitLab"
          className="h-24 w-24 rounded-lg object-contain"
          style={{ animation: "pulse-soft 1.6s ease-in-out infinite" }}
        />
        {/* Flowing signal dots */}
        <svg
          width={220}
          height={40}
          viewBox="0 0 220 40"
          className="absolute -bottom-14"
        >
          <line
            x1="0"
            y1="20"
            x2="220"
            y2="20"
            stroke="var(--color-wire)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.5"
          />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx="0" cy="20" r="4" fill="var(--color-signal-on)">
              <animate
                attributeName="cx"
                from="0"
                to="220"
                dur="1.6s"
                begin={`${i * 0.4}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                dur="1.6s"
                begin={`${i * 0.4}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </svg>
      </div>

      <div className="mt-24 flex flex-col items-center gap-2">
        {/* eslint-disable-next-line formatjs/no-literal-string-in-jsx */}
        <div className="font-display text-lg font-semibold tracking-tight">
          BitLab
        </div>
        <div className="text-xs font-mono text-muted-foreground">{message}</div>
        <div className="mt-2 h-0.5 w-48 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-accent"
            style={{ animation: "dgl-bar 1.2s ease-in-out infinite" }}
          />
        </div>
      </div>

      {}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes dg-ring-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulse-soft {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.04); opacity: 0.9; }
            }
            @keyframes dgl-bar {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `,
        }}
      />
    </div>
  );
}

export default BitLabLoader;
