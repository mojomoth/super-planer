import Image from "next/image";

// size = height of the indigo S square in px. The original logo SVG has 8/64 padding around
// the square, so the negative margin cancels it and the square sits flush at the box edge.
export function Logo({ size = 40, iconOnly = false, className }: { size?: number; iconOnly?: boolean; className?: string }) {
  if (iconOnly) {
    return <Image src="/super-planer-icon.svg" alt="Super Planer" width={size} height={size} className={className} priority />;
  }
  const pad = (size * 8) / 64;
  return (
    <Image
      src="/super-planer-logo.svg"
      alt="Super Planer"
      width={(size * 328) / 64}
      height={(size * 80) / 64}
      style={{ margin: -pad }}
      className={className}
      priority
    />
  );
}
