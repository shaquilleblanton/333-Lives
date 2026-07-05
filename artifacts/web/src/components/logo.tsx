interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "mark" | "full";
  className?: string;
}

export function Logo333({ size = "md", variant = "mark", className = "" }: LogoProps) {
  const dims = { sm: 28, md: 36, lg: 56 };
  const d = dims[size];

  if (variant === "mark") {
    return (
      <svg
        width={d}
        height={d}
        viewBox="0 0 56 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="333 Lives"
      >
        {/* Halo */}
        <ellipse cx="28" cy="10" rx="12" ry="3" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" opacity="0.9" />

        {/* Left wing */}
        <path
          d="M14 24 C8 20 2 16 4 10 C6 14 10 16 14 18 C10 15 7 12 10 8 C11 12 14 15 16 20Z"
          fill="url(#goldGrad)"
          opacity="0.95"
        />
        {/* Left wing feathers */}
        <path d="M14 24 C9 22 5 19 6 14" stroke="url(#goldGrad)" strokeWidth="0.8" fill="none" opacity="0.6" />
        <path d="M15 22 C10 21 7 18 8 12" stroke="url(#goldGrad)" strokeWidth="0.8" fill="none" opacity="0.5" />

        {/* Right wing */}
        <path
          d="M42 24 C48 20 54 16 52 10 C50 14 46 16 42 18 C46 15 49 12 46 8 C45 12 42 15 40 20Z"
          fill="url(#goldGrad)"
          opacity="0.95"
        />
        {/* Right wing feathers */}
        <path d="M42 24 C47 22 51 19 50 14" stroke="url(#goldGrad)" strokeWidth="0.8" fill="none" opacity="0.6" />
        <path d="M41 22 C46 21 49 18 48 12" stroke="url(#goldGrad)" strokeWidth="0.8" fill="none" opacity="0.5" />

        {/* The 3 S-glyphs (stylized 3s where S shape gets a top bar) */}
        {/* Left 3 */}
        <g transform="translate(11, 26)">
          <line x1="1" y1="0" x2="8" y2="0" stroke="url(#goldGrad)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 0 C10 0 10 3 8 4.5 C10 4.5 10 7.5 8 8 L1 8" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M3 4.5 L8 4.5" stroke="url(#goldGrad)" strokeWidth="1.2" strokeLinecap="round" />
        </g>
        {/* Center 3 */}
        <g transform="translate(22, 26)">
          <line x1="1" y1="0" x2="8" y2="0" stroke="url(#goldGrad)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 0 C10 0 10 3 8 4.5 C10 4.5 10 7.5 8 8 L1 8" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M3 4.5 L8 4.5" stroke="url(#goldGrad)" strokeWidth="1.2" strokeLinecap="round" />
        </g>
        {/* Right 3 */}
        <g transform="translate(33, 26)">
          <line x1="1" y1="0" x2="8" y2="0" stroke="url(#goldGrad)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 0 C10 0 10 3 8 4.5 C10 4.5 10 7.5 8 8 L1 8" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M3 4.5 L8 4.5" stroke="url(#goldGrad)" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* LIVES text */}
        <text
          x="28"
          y="46"
          textAnchor="middle"
          fill="url(#goldGrad)"
          fontSize="6"
          fontFamily="'Playfair Display', serif"
          fontWeight="700"
          letterSpacing="2"
        >
          LIVES
        </text>

        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8C96E" />
            <stop offset="50%" stopColor="#BB734A" />
            <stop offset="100%" stopColor="#C8A456" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Logo333 size={size} variant="mark" />
      <span
        style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "0.05em" }}
        className="text-foreground font-semibold"
      >
        333 Lives
      </span>
    </div>
  );
}
