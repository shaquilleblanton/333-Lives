interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const DIMS = { sm: 28, md: 36, lg: 80 };

export function Logo333({ size = "md", className = "" }: LogoProps) {
  const d = DIMS[size];
  return (
    <img
      src="/assets/logo-mark.png"
      width={d}
      height={d}
      alt="333 Lives"
      style={{ objectFit: "contain" }}
      className={className}
    />
  );
}
