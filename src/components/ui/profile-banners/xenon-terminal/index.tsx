import React from "react";

export const XenonTerminalBanner: React.FC<{ className?: string, isStatic?: boolean }> = ({
  className,
  isStatic = false,
}) => {
  return (
    <div
      className={
        "relative w-full h-40 rounded-xl overflow-hidden bg-black " +
        "border border-violet-500/40 shadow-[0_0_40px_rgba(0,0,0,0.9)] " +
        (className ?? "")
      }
    >
      {/* Base gradient + noise */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#1f2937,_#020617)]">
        <div className="absolute inset-0 opacity-[0.12] bg-[url('/noise.png')]" />
      </div>

      {/* Terminal grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-6 border border-violet-500/40 rounded-lg bg-black/40 backdrop-blur-sm">
          {/* Scanlines */}
          <div className={`absolute inset-0 bg-[linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[length:100%_3px] opacity-40 mix-blend-screen ${!isStatic ? 'animate-terminal-scan' : ''}`} />
          {/* Vertical grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.18)_1px,transparent_1px)] bg-[length:12px_100%] opacity-30 mix-blend-screen" />
        </div>
      </div>

      {/* Data rings / core */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          viewBox="0 0 260 260"
          className={`w-[70%] h-[70%] ${!isStatic ? 'animate-terminal-core-rotate' : ''}`}
        >
          <defs>
            <radialGradient id="xenonCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#4c1d95" />
            </radialGradient>
          </defs>

          <circle
            cx="130"
            cy="130"
            r="90"
            stroke="rgba(129,140,248,0.7)"
            strokeWidth="4"
            fill="none"
            className="drop-shadow-[0_0_12px_rgba(129,140,248,0.8)]"
          />
          <circle
            cx="130"
            cy="130"
            r="60"
            stroke="rgba(56,189,248,0.9)"
            strokeWidth="3"
            fill="none"
            strokeDasharray="10 8"
          />
          <circle
            cx="130"
            cy="130"
            r="32"
            fill="url(#xenonCore)"
            className={!isStatic ? 'animate-terminal-core-pulse' : ''}
          />
        </svg>
      </div>

      {/* Glyph rain */}
      <XenonGlyphRain isStatic={isStatic} />

      {/* Cursor pulse */}
      <div className="absolute bottom-4 left-8 flex items-center gap-2 text-xs font-mono text-cyan-300/90">
        <span className="opacity-70">/xenon/terminal&gt;</span>
        <span className={`w-2 h-3 bg-cyan-300 ${!isStatic ? 'animate-terminal-cursor' : ''}`} />
      </div>
    </div>
  );
};

const XenonGlyphRain: React.FC<{ isStatic?: boolean }> = ({ isStatic }) => {
  const cols = 18;
  const glyphs = ["Ξ", "λ", "7", "F", "X", "∑", "Ω", "1", "0"];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          className={`absolute top-0 text-[0.6rem] font-mono text-cyan-300/70 ${!isStatic ? 'animate-xenon-glyph-column' : ''}`}
          style={{
            left: `${(i / cols) * 100}%`,
            animationDelay: `${i * 0.3}s`,
            transform: isStatic ? `translateY(${Math.random() * 100}%)` : undefined,
            opacity: isStatic ? 0.5 : undefined,
          }}
        >
          {Array.from({ length: 18 }).map((__, j) => {
            const idx = (i * 7 + j * 3) % glyphs.length;
            return (
              <div
                key={j}
                className="leading-3 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)]"
              >
                {glyphs[idx]}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
