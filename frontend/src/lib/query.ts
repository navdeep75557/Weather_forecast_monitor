/** Dashboard query: defaults, URL (de)serialisation for shareable links, and a plain-English summary. */
import { useEffect, useState } from "react";
import type { Query } from "../types";

export const MIN_DATE = "2026-01-01";
export const MAX_DATE = "2026-01-31";

export const DEFAULT_QUERY: Query = {
  start: MIN_DATE,
  end: MAX_DATE,
  mode: "cutoff",
  cutoffHour: 9,
  cutoffMinute: 50,
  horizonHours: 24,
};

const pad = (n: number) => String(n).padStart(2, "0");
export const cutoffLabel = (q: Pick<Query, "cutoffHour" | "cutoffMinute">) => `${pad(q.cutoffHour)}:${pad(q.cutoffMinute)}`;

const isJanDate = (s: string | null): s is string => !!s && /^2026-01-(0[1-9]|[12]\d|3[01])$/.test(s);

/** Parse a query string, falling back to defaults for anything missing or out of scope. */
export function parseQuery(search: string): Query {
  const p = new URLSearchParams(search);
  let start = isJanDate(p.get("start")) ? p.get("start")! : DEFAULT_QUERY.start;
  let end = isJanDate(p.get("end")) ? p.get("end")! : DEFAULT_QUERY.end;
  if (start > end) [start, end] = [end, start];
  const mode = p.get("mode") === "horizon" ? "horizon" : "cutoff";
  const cut = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(p.get("cutoff") ?? "");
  const h = Number(p.get("h"));
  return {
    start,
    end,
    mode,
    cutoffHour: cut ? Number(cut[1]) : DEFAULT_QUERY.cutoffHour,
    cutoffMinute: cut ? Number(cut[2]) : DEFAULT_QUERY.cutoffMinute,
    horizonHours: p.has("h") && Number.isInteger(h) && h >= 0 && h <= 48 ? h : DEFAULT_QUERY.horizonHours,
  };
}

export function serializeQuery(q: Query): string {
  const p = new URLSearchParams({ start: q.start, end: q.end, mode: q.mode });
  if (q.mode === "cutoff") p.set("cutoff", cutoffLabel(q));
  else p.set("h", String(q.horizonHours));
  return `?${p.toString()}`;
}

/** Query state mirrored into the URL (replaceState, so filters don't spam browser history). */
export function useUrlQuery(): [Query, (q: Query) => void] {
  const [query, setQuery] = useState<Query>(() => parseQuery(window.location.search));
  useEffect(() => {
    const next = serializeQuery(query);
    if (next !== window.location.search) window.history.replaceState(null, "", `${window.location.pathname}${next}`);
  }, [query]);
  return [query, setQuery];
}

/** One-line description of the active forecast-selection rule. */
export function logicSummary(q: Query): string {
  if (q.mode === "cutoff") {
    return `Using the latest forecast published by ${cutoffLabel(q)} UK time on the day before delivery.`;
  }
  return q.horizonHours === 0
    ? "Using the latest forecast published before each delivery hour."
    : `Using the latest forecast published at least ${q.horizonHours} hours before each delivery hour.`;
}
