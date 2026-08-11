import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import TiltCard from "./TiltCard";

// Matches TiltCard's passthrough type — a hover card may render through TiltCard (a
// motion.div), whose drag/animation event handlers have different signatures than the
// plain DOM ones HTMLAttributes declares.
type CardDivProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onTransitionEnd"
>;

interface CardProps extends CardDivProps {
  hover?: boolean;
  gradient?: boolean;
  glass?: boolean;
  /** Disables the cursor-tracking 3D tilt on a hover card while keeping the lift/shadow — for hover cards that sit inside dense, low-height rows where a tilt would feel busy. */
  flat?: boolean;
}

export default function Card({
  hover = false,
  gradient = false,
  glass = false,
  flat = false,
  className,
  children,
  ...props
}: CardProps) {
  const cardClassName = cn(
    "card p-5",
    hover && "card-hover",
    gradient && "card-gradient",
    glass && "card-glass",
    className
  );

  if (hover && !flat) {
    return (
      <TiltCard className={cardClassName} {...props}>
        {children}
      </TiltCard>
    );
  }

  return (
    <div className={cardClassName} {...props}>
      {children}
    </div>
  );
}
