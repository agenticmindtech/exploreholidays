import { cn } from "@/lib/utils/cn";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

function getInitials(name = ""): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface AvatarProps {
  name?: string;
  src?: string;
  size?: Size;
  className?: string;
}

export default function Avatar({ name = "", src, size = "md", className }: AvatarProps) {
  const sizeClass = SIZES[size] ?? SIZES.md;

  if (src) {
    return (
      <span className={cn("relative inline-block shrink-0 overflow-hidden rounded-full", sizeClass, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-grad-brand font-display font-bold text-white",
        sizeClass,
        className
      )}
    >
      {getInitials(name) || "?"}
    </span>
  );
}
