"use client";

import { useRef, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils/cn";

// framer-motion's motion.div redefines a handful of DOM event handlers (drag/animation/
// transition) with its own gesture-aware signatures — omit those from the plain-HTML
// passthrough type so spreading `rest` onto <motion.div> below type-checks cleanly.
type PassthroughDivProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onTransitionEnd"
>;

interface TiltCardProps extends PassthroughDivProps {
  children: ReactNode;
  className?: string;
  /** Max rotation in degrees at the edge of the card. */
  intensity?: number;
}

/**
 * Cursor-tracking 3D tilt + cursor-follow shine, built on framer-motion (already in the
 * bundle) rather than a 3D library — cheap enough to apply broadly across dashboard/report
 * cards without the weight of a WebGL scene. Respects prefers-reduced-motion by simply
 * never engaging the tilt (the card still renders, just flat). Forwards any other DOM
 * props (onClick, id, …) since Card.tsx spreads its own passthrough props through here.
 */
export default function TiltCard({ children, className, intensity = 6, onMouseMove, onMouseLeave, ...rest }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [intensity, -intensity]), { stiffness: 300, damping: 28 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-intensity, intensity]), { stiffness: 300, damping: 28 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    onMouseMove?.(e);
    if (reduceMotion) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    x.set(px);
    y.set(py);
    ref.current?.style.setProperty("--tilt-x", `${px * 100}%`);
    ref.current?.style.setProperty("--tilt-y", `${py * 100}%`);
  }

  function handleMouseLeave(e: MouseEvent<HTMLDivElement>) {
    onMouseLeave?.(e);
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <div className="tilt-perspective">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={reduceMotion ? undefined : { rotateX, rotateY }}
        className={cn("tilt-surface relative", className)}
        {...rest}
      >
        {children}
        {!reduceMotion && <div className="tilt-shine" aria-hidden="true" />}
      </motion.div>
    </div>
  );
}
