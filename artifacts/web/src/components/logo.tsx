interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const DIMS = { sm: 56, md: 72, lg: 120, xl: 180 };

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
