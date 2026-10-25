/** Yield to the browser so the current frame paints before non-critical work (network, lazy chunks) starts. */
import { useEffect, useState } from "react";

/** Resolves after the next paint (rAF + task), or after 100 ms if rAF is throttled (background tab). */
export function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 0));
    setTimeout(resolve, 100);
  });
}

/** False on the first render, true once that render has been painted. */
export function useAfterPaint(): boolean {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    let alive = true;
    void afterPaint().then(() => alive && setPainted(true));
    return () => {
      alive = false;
    };
  }, []);
  return painted;
}
