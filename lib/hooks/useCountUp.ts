"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface UseCountUpOptions {
  /** Spring stiffness — higher settles faster. */
  stiffness?: number;
  /** Spring damping — higher settles with less overshoot. */
  damping?: number;
}

export function useCountUp(target: number, { stiffness = 90, damping = 18 }: UseCountUpOptions = {}) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const numericTarget = Number(target) || 0;
    const controls = animate(prevTarget.current, numericTarget, {
      type: "spring",
      stiffness,
      damping,
      onUpdate: (latest) => setValue(latest),
    });
    prevTarget.current = numericTarget;
    return () => controls.stop();
  }, [target, stiffness, damping]);

  return value;
}
