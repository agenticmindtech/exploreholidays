"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Fade + 8px rise on every route change (spec §4/§8), 220ms ease-smooth. MotionConfig at
 * the root already gates this for prefers-reduced-motion.
 *
 * `mode="popLayout"`, not `mode="wait"`: "wait" holds the new route unmounted until the
 * old one's exit animation fully finishes, which delays that new page's data-fetching
 * effect by the whole exit duration on every single navigation — the dominant cause of
 * navigation feeling slow. "popLayout" pops the exiting page out of layout flow so the
 * incoming page mounts (and starts fetching) immediately, while the old one fades out on
 * top with no double-stacking layout jump.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
