import { CircleHelp, Moon, Sun, Wind } from "lucide-react";
import { fmtAgo } from "../lib/format";
import type { Theme } from "../lib/prefs";
import type { HealthResponse } from "../types";
import { Button } from "./ui/Button";

interface TopBarProps {
  health: HealthResponse | null;
  theme: Theme;
  onToggleTheme: () => void;
  onHelp: () => void;
}

function Freshness({ health }: { health: HealthResponse | null }) {
  const ok = health?.status === "ok";
  const label = !health
    ? "Connecting…"
    : ok
      ? `Elexon BMRS · ${health.source === "elexon" ? "live fetch" : "final-data snapshot"} · loaded ${health.loaded_at ? fmtAgo(health.loaded_at) : ""}`
      : "Data unavailable";
  return (
    <span className="flex items-center gap-2 text-xs text-fg-3" title={health?.loaded_at ?? undefined}>
      <span aria-hidden className={`size-2 rounded-full ${!health ? "bg-border-strong" : ok ? "bg-emerald-600" : "bg-danger"}`} />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </span>
  );
}

export function TopBar({ health, theme, onToggleTheme, onHelp }: TopBarProps) {
  return (
    <header className="border-b border-border bg-surface transition-colors duration-150">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-4 sm:gap-3 md:px-6">
        <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg sm:flex">
          <Wind className="size-4" aria-hidden />
        </div>
        <h1 className="truncate text-base font-semibold tracking-tight">Wind Forecast Monitor</h1>
        <span className="shrink-0 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-fg-2">Jan 2026</span>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <Freshness health={health} />
          <Button variant="ghost" size="icon" aria-label="How to read this dashboard" onClick={onHelp}>
            <CircleHelp aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
          </Button>
        </div>
      </div>
    </header>
  );
}
