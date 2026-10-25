"""Independent end-to-end check of the running API against raw Elexon BMRS data.

Does NOT import the app: fetches FUELHH/WINDFOR directly, re-implements forecast selection
with zoneinfo, recomputes metrics with pandas and compares with the API.

Usage:  python qa/verify_elexon.py [API_BASE]     (default http://localhost:8000)
Exit code 0 = all checks pass.
"""

import random
import sys
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx
import numpy as np
import pandas as pd

API = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000").rstrip("/")
BMRS = "https://data.elexon.co.uk/bmrs/api/v1"
LONDON = ZoneInfo("Europe/London")
UTC = timezone.utc
TOL = 0.15  # API rounds MW metrics to 0.1
# Scope: purchase decisions made in January 2026 (D-1) -> delivery days 2 Jan - 1 Feb 2026.
FIRST_DELIVERY, LAST_DELIVERY = date(2026, 1, 2), date(2026, 2, 1)
LO = pd.Timestamp(FIRST_DELIVERY, tz="UTC")  # GMT in Jan/Feb, so London dates == UTC dates
HI = pd.Timestamp(LAST_DELIVERY + timedelta(days=1), tz="UTC")
failures: list[str] = []


def check(ok: bool, label: str, detail: str = "") -> None:
    print(f"[{'PASS' if ok else 'FAIL'}] {label}" + (f" - {detail}" if detail else ""))
    if not ok:
        failures.append(label)


def bmrs(path: str, params: dict) -> list[dict]:
    r = httpx.get(f"{BMRS}{path}", params=params, timeout=60)
    r.raise_for_status()
    body = r.json()
    return body if isinstance(body, list) else body["data"]


def api(path: str, **params):
    r = httpx.get(f"{API}{path}", params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def cutoff_utc(target: pd.Timestamp, hh: int, mm: int) -> pd.Timestamp:
    """HH:MM Europe/London on the day before the target's London date."""
    d_minus_1 = target.tz_convert(LONDON).date() - timedelta(days=1)
    return pd.Timestamp(datetime.combine(d_minus_1, time(hh, mm), tzinfo=LONDON).astimezone(UTC))


def stats(err: pd.Series, actual: pd.Series) -> dict:
    a = err.abs()
    return {
        "mae": a.mean(),
        "rmse": float(np.sqrt((err**2).mean())),
        "bias": err.mean(),
        "mape": (a / actual).mean() * 100,
        "p90_abs_error": float(np.percentile(a, 90)),
    }


def compare(label: str, mine: dict, theirs: dict) -> None:
    diffs = {k: (round(mine[k], 2), theirs[k]) for k in mine if abs(mine[k] - theirs[k]) > (0.015 if k == "mape" else TOL)}
    check(not diffs, label, f"mismatch {diffs}" if diffs else f"MAE {theirs['mae']}, RMSE {theirs['rmse']}, bias {theirs['bias']}")


# ---------------- raw data ----------------
print(f"API: {API}\nFetching raw Elexon data ...")
fuel = []
d = FIRST_DELIVERY
while d <= LAST_DELIVERY:
    hi = min(d + timedelta(days=6), LAST_DELIVERY)
    fuel += bmrs("/datasets/FUELHH/stream", {"settlementDateFrom": d.isoformat(), "settlementDateTo": hi.isoformat()})
    d = hi + timedelta(days=1)
fuel = pd.DataFrame(fuel)
wind = fuel[fuel["fuelType"] == "WIND"].copy()
wind["start_time"] = pd.to_datetime(wind["startTime"], utc=True)

runs = []
t = datetime(2025, 12, 28, tzinfo=UTC)
while t < HI.to_pydatetime():
    nxt = min(t + timedelta(days=7), HI.to_pydatetime())
    runs += bmrs("/datasets/WINDFOR/stream", {"publishDateTimeFrom": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "publishDateTimeTo": nxt.strftime("%Y-%m-%dT%H:%M:%SZ")})
    t = nxt
fc = pd.DataFrame(runs)
fc["start_time"] = pd.to_datetime(fc["startTime"], utc=True)
fc["publish_time"] = pd.to_datetime(fc["publishTime"], utc=True)
fc = fc.drop_duplicates(["publish_time", "start_time"])
fc = fc[(fc["start_time"] >= LO) & (fc["start_time"] < HI) & (fc["publish_time"] < HI)]

# ---------------- actuals ----------------
print("\n== Actuals")
print(f"raw FUELHH rows (all fuels): {len(fuel)}, fuel types: {sorted(fuel['fuelType'].unique())}")
dup = wind.duplicated("start_time").sum()
check(dup == 0, "raw WIND has no duplicate startTime", f"{dup} duplicates")
wind = wind.sort_values("publishTime").drop_duplicates("start_time", keep="last").set_index("start_time").sort_index()
expected = pd.date_range(LO, HI - pd.Timedelta("30min"), freq="30min")
missing = expected.difference(wind.index)
check(len(missing) == 0, "raw WIND covers every delivery half-hour (2 Jan - 1 Feb)", f"{len(wind)} rows, gaps: {list(missing[:5])}")
check(bool((wind.index.to_series().diff().dropna() == pd.Timedelta("30min")).all()), "raw WIND is strictly 30-min spaced")

api_act = pd.DataFrame(api("/api/actuals"))
api_act["start_time"] = pd.to_datetime(api_act["start_time"], utc=True)
api_act = api_act.set_index("start_time")
check(len(api_act) == 1488 and api_act.index.is_unique, "API actuals: 1488 unique half-hours", f"{len(api_act)} rows")
check(api_act.index.min() == LO and api_act.index.max() == HI - pd.Timedelta("30min"), "API actuals limited to delivery 2 Jan - 1 Feb")
same = api_act["actual_mw"].reindex(wind.index).sub(wind["generation"]).abs().max()
check(same == 0, "API actuals equal raw FUELHH WIND values", f"max abs diff {same}")
other = fuel[fuel["fuelType"] != "WIND"]
other_match = (other.assign(st=pd.to_datetime(other["startTime"], utc=True)).merge(api_act, left_on="st", right_index=True).query("generation == actual_mw"))
print(f"(info) non-WIND rows that coincidentally equal the API value: {len(other_match)} of {len(other)}")

# ---------------- forecast selection: 5 random targets ----------------
print("\n== Cutoff selection (09:50 London, D-1) - 5 random targets + edges")
random.seed(2026)
hours = sorted(fc["start_time"].unique())
targets = random.sample(hours, 5) + [hours[0], hours[-1]]
for tgt in targets:
    tgt = pd.Timestamp(tgt)
    co = cutoff_utc(tgt, 9, 50)
    cand = fc[(fc["start_time"] == tgt) & (fc["publish_time"] <= co)]
    want = cand.loc[cand["publish_time"].idxmax()] if not cand.empty else None
    day = tgt.tz_convert(LONDON).date().isoformat()
    rows = {r["start_time"]: r for r in api("/api/forecasts/latest", start=day, end=day)}
    got = rows.get(tgt.strftime("%Y-%m-%dT%H:%M:%SZ"))
    ok = want is not None and got is not None and pd.Timestamp(got["publish_time"]) == want["publish_time"] and got["forecast_mw"] == want["generation"]
    check(ok, f"target {tgt:%Y-%m-%d %H:%M}Z: cutoff {co:%Y-%m-%d %H:%M}Z -> publish {want['publish_time']:%m-%d %H:%M}Z", f"API {got and got['publish_time']} / {got and got['forecast_mw']} MW")

# ---------------- independent full selection + metrics ----------------
def select(cutoffs: pd.Series) -> pd.DataFrame:
    f = fc.merge(cutoffs.rename("cutoff"), left_on="start_time", right_index=True)
    f = f[f["publish_time"] <= f["cutoff"]]
    return f.sort_values("publish_time").groupby("start_time").tail(1).set_index("start_time")


def joined(sel: pd.DataFrame) -> pd.DataFrame:
    j = sel[["generation", "publish_time"]].rename(columns={"generation": "forecast"}).join(wind["generation"].rename("actual"), how="inner")
    j["err"] = j["forecast"] - j["actual"]
    return j


targets_all = pd.Series(hours, index=pd.DatetimeIndex(hours))
print("\n== Metrics recomputed independently")
for hh, mm in [(9, 50), (6, 0), (12, 0)]:
    j = joined(select(targets_all.map(lambda t: cutoff_utc(pd.Timestamp(t), hh, mm))))
    m = api("/api/metrics", cutoff_hour=hh, cutoff_minute=mm, include_points="false")["overall"]
    check(m["n"] == len(j), f"cutoff {hh:02d}:{mm:02d} n", f"{len(j)} vs API {m['n']}")
    compare(f"cutoff {hh:02d}:{mm:02d} overall metrics", stats(j["err"], j["actual"]), m)

sel = select(targets_all.map(lambda t: cutoff_utc(pd.Timestamp(t), 9, 50)))
first_pub, last_pub = sel["publish_time"].min(), sel["publish_time"].max()
check(first_pub >= pd.Timestamp("2026-01-01", tz="UTC") and last_pub <= pd.Timestamp("2026-01-31 09:50", tz="UTC"),
      "decision-time forecasts were all published in January 2026 (by 09:50 on 31 Jan)", f"{first_pub} .. {last_pub}")

wk = targets_all[(targets_all >= pd.Timestamp("2026-01-08", tz="UTC")) & (targets_all < pd.Timestamp("2026-01-15", tz="UTC"))]
j = joined(select(wk.map(lambda t: cutoff_utc(pd.Timestamp(t), 9, 50))))
compare("8-14 Jan sub-range metrics", stats(j["err"], j["actual"]), api("/api/metrics", start="2026-01-08", end="2026-01-14", include_points="false")["overall"])

print("\n== Horizon mode")
for H in [0, 6, 24, 48]:
    j = joined(select(targets_all - pd.Timedelta(hours=H)))
    body = api("/api/metrics", horizon_hours=H)
    pts = pd.DataFrame(body["points"])
    lead_ok = bool(((pd.to_datetime(pts["start_time"]) - pd.to_datetime(pts["publish_time"])) >= pd.Timedelta(hours=H)).all())
    check(lead_ok, f"H={H}: every chosen publishTime <= startTime - {H}h")
    same_pub = (pd.to_datetime(pts.set_index(pd.to_datetime(pts["start_time"]))["publish_time"]).reindex(j.index) == j["publish_time"]).all()
    check(bool(same_pub) and len(pts) == len(j), f"H={H}: chosen run is the latest eligible ({len(j)} targets)")
    compare(f"H={H} overall metrics", stats(j["err"], j["actual"]), body["overall"])

print("\n== Error by horizon (all runs)")
allj = fc.set_index("start_time").join(wind["generation"].rename("actual"), how="inner")
allj = allj[allj["publish_time"] <= allj.index]
allj["h"] = (allj.index - allj["publish_time"]).dt.total_seconds() / 3600
allj["err"] = allj["generation"] - allj["actual"]
for b in api("/api/error-by-horizon")["buckets"]:
    g = allj[(allj["h"] >= b["min_hours"]) & (allj["h"] < b["max_hours"])]
    ok = len(g) == b["n"] and abs(g["err"].abs().mean() - b["mae"]) <= TOL and abs(g["err"].mean() - b["bias"]) <= TOL
    check(ok, f"bucket {b['bucket']}", f"n {len(g)}/{b['n']}, MAE {g['err'].abs().mean():.1f}/{b['mae']}")

print(f"\n{'ALL CHECKS PASSED' if not failures else f'{len(failures)} FAILED: {failures}'}")
sys.exit(1 if failures else 0)
