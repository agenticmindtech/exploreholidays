import type { ButtonHTMLAttributes } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
}

const SIZES: Record<Size, string> = {
  sm: "px-3 py-2 text-xs min-h-[40px]",
  md: "px-4 py-2.5 text-sm min-h-[40px]",
  lg: "px-5 py-3 text-base min-h-[44px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  disabled = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn("btn", `btn-${variant}`, SIZES[size], className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      {children}
    </button>
  );
}
