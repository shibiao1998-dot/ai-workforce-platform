"use client";

import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 1200, decimals = 0): string {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCurrent(0);
      return;
    }

    const animate = (ts: number) => {
      if (startTime.current === null) startTime.current = ts;
      const elapsed = ts - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);
      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
      }
    };

    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      startTime.current = null;
    };
  }, [target, duration]);

  return current.toFixed(decimals);
}
