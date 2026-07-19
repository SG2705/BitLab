/**
 * BitLabStart
 */
function BitLabStart() {
  return (
    <div className="relative mx-auto h-28 w-28">
      {/* Rotating glow ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, color-mix(in oklab, var(--primary) 70%, transparent), transparent 60%)",
          animation:
            "dg-ring-spin 4s linear infinite, dg-ring-glow 2.4s ease-in-out infinite",
          filter: "blur(6px)",
        }}
      />
      {/* Glass badge */}
      <div className="absolute inset-2 rounded-2xl glass-panel flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 100 100"
          className="h-16 w-16"
          style={{ animation: "dg-gate-float 3s ease-in-out infinite" }}
        >
          <defs>
            <linearGradient id="dg-gate-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Input wires */}
          <path
            d="M8 35 H32"
            stroke="var(--wire)"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="6 6"
            style={{ animation: "dg-wire-flow 0.9s linear infinite" }}
          />
          <path
            d="M8 65 H32"
            stroke="var(--wire)"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="6 6"
            style={{ animation: "dg-wire-flow 1.1s linear infinite" }}
          />
          {/* Output wire */}
          <path
            d="M78 50 H94"
            stroke="var(--wire)"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="6 6"
            style={{ animation: "dg-wire-flow 0.7s linear infinite" }}
          />

          {/* AND gate body (D-shape) */}
          <path
            d="M32 22 H50 A28 28 0 0 1 50 78 H32 Z"
            fill="url(#dg-gate-grad)"
            fillOpacity="0.18"
            stroke="url(#dg-gate-grad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Signal nodes */}
          <circle
            cx="8"
            cy="35"
            r="3"
            style={{ animation: "dg-signal-in-a 2.4s ease-in-out infinite" }}
          />
          <circle
            cx="8"
            cy="65"
            r="3"
            style={{ animation: "dg-signal-in-b 2.4s ease-in-out infinite" }}
          />
          <circle
            cx="94"
            cy="50"
            r="3.5"
            style={{ animation: "dg-signal-out 2.4s ease-in-out infinite" }}
          />
        </svg>
      </div>
    </div>
  );
}

export default BitLabStart;
