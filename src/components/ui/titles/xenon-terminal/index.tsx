import React from "react";

export const XenonTerminalTitle: React.FC<{ className?: string, isStatic?: boolean }> = ({
  className,
  isStatic = false,
}) => {
  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <svg
        viewBox="0 0 800 140"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="xenonTitleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="40%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>

        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Space Mono, ui-monospace, SFMono-Regular, Menlo, Monaco"
          fontSize="52"
          fill="url(#xenonTitleGrad)"
          className={`tracking-[0.35em] drop-shadow-[0_0_12px_rgba(56,189,248,0.9)] ${!isStatic ? 'animate-xenon-title-glow' : ''}`}
        >
          XENON TERMINAL
        </text>
      </svg>
    </div>
  );
};
