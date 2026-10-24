/** Per-viewer preferences in localStorage (theme, dismissed guide). Every access is guarded. */
import { useCallback, useState } from "react";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode etc.) - preference just won't persist */
  }
}

export type Theme = "light" | "dark";

/** Light by default; the inline script in index.html applies a saved choice before first paint. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#09090b" : "#fafafa");
      write("wfm-theme", next);
      return next;
    });
  }, []);
  return [theme, toggle];
}

/** "How to read this dashboard" guide: shown until dismissed. */
export function useGuide(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(() => read("wfm-guide-dismissed") !== "1");
  const set = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) write("wfm-guide-dismissed", "1");
  }, []);
  return [open, set];
}
