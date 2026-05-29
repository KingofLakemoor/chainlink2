import React from "react";

export const XenonTerminalAvatarRing: React.FC<{ size?: number, isStatic?: boolean }> = ({
  size = 256,
  isStatic = false,
}) => {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow */}
      <div className={`absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.35),_transparent_70%)] blur-2xl ${!isStatic ? 'animate-terminal-core-pulse' : ''}`} />

      {/* Ring */}
      <svg
        viewBox="0 0 260 260"
        className={`absolute inset-0 ${!isStatic ? 'animate-terminal-ring-rotate' : ''}`}
      >
        <defs>
          <linearGradient id="xenonRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        <circle
          cx="130"
          cy="130"
          r="118"
          stroke="url(#xenonRingGrad)"
          strokeWidth="10"
          fill="none"
          className="drop-shadow-[0_0_16px_rgba(56,189,248,0.9)]"
        />

        <circle
          cx="130"
          cy="130"
          r="96"
          stroke="rgba(56,189,248,0.9)"
          strokeWidth="4"
          fill="none"
          strokeDasharray="10 14"
          className="opacity-80"
        />

        {/* Small nodes */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x = 130 + Math.cos(angle) * 118;
          const y = 130 + Math.sin(angle) * 118;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill="#38bdf8"
              className="drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]"
            />
          );
        })}
      </svg>

      {/* Avatar slot */}
      <div className="absolute inset-[22%] rounded-full overflow-hidden bg-black/60 backdrop-blur-sm" />
    </div>
  );
};
