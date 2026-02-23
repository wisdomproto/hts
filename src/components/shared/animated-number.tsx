"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type AnimatedNumberProps = {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
};

export function AnimatedNumber({
  value,
  format = (n) => n.toLocaleString(),
  duration = 800,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prevValue = useRef(value);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const diff = end - start;

    if (diff === 0) return;

    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    }

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={cn("font-mono tabular-nums", className)}>
      {format(display)}
    </span>
  );
}
