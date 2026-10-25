import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Renders children once the placeholder scrolls near the viewport (and keeps them after).
 * Keeps heavy below-the-fold charts off the main thread during first load; the placeholder
 * must have the same height as the content so nothing shifts.
 */
export function InView({ children, placeholder, rootMargin = "300px" }: { children: ReactNode; placeholder: ReactNode; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, rootMargin]);

  return seen ? <>{children}</> : <div ref={ref}>{placeholder}</div>;
}
