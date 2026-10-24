"""Plain-English takeaways derived from the computed metrics."""

import pandas as pd

from .config import LONDON


def _mw(x: float) -> str:
    return f"{abs(x):,.0f} MW"


def build_insights(
    overall: dict,
    daily: list[dict],
    horizon: list[dict],
    joined: pd.DataFrame,
    fresh: dict | None,
    label: str,
) -> list[dict]:
    """Short, decision-oriented observations. Error convention: forecast - actual."""
    if not overall["n"]:
        return [{"kind": "accuracy", "text": "No forecast/actual pairs in the selected range."}]
    out: list[dict] = []
    mean = overall["mean_actual"] or 0
    bias, mae, rmse, p90 = overall["bias"], overall["mae"], overall["rmse"], overall["p90_abs_error"]

    bias_pct = bias / mean * 100 if mean else 0
    if abs(bias_pct) < 2:
        out.append({"kind": "bias", "text": f"The {label} was broadly unbiased: average error {bias:+,.0f} MW ({bias_pct:+.1f}% of mean wind output)."})
    else:
        direction = "over-predicted" if bias > 0 else "under-predicted"
        out.append({"kind": "bias", "text": f"The {label} {direction} wind by {_mw(bias)} on average ({abs(bias_pct):.1f}% of the {_mw(mean)} mean output)."})

    ratio = rmse / mae if mae else 0
    spread = "a few large misses drive much of the error" if ratio > 1.3 else "errors are fairly evenly spread rather than dominated by outliers"
    share = f", about {mae / mean * 100:.0f}% of average output" if mean else ""
    out.append({"kind": "accuracy", "text": f"Typical error (MAE) was {_mw(mae)}{share}; RMSE/MAE = {ratio:.2f}, so {spread}."})

    worst = joined.loc[joined["error_mw"].abs().idxmax()]
    when = worst["start_time"].tz_convert(LONDON).strftime("%d %b %H:%M")
    out.append({"kind": "risk", "text": f"In 90% of hours the forecast was within ±{_mw(p90)} of outturn, a practical size for a day-ahead buffer. Largest miss: {worst['error_mw']:+,.0f} MW at {when}."})

    if fresh and fresh["n"] and fresh["mae"] is not None and fresh["mae"] < mae:
        cut = (1 - fresh["mae"] / mae) * 100
        out.append({"kind": "decision", "text": f"Waiting for the latest pre-delivery forecast would cut MAE from {_mw(mae)} to {_mw(fresh['mae'])} ({cut:.0f}% lower). That gap is the accuracy cost of committing a day ahead."})

    buckets = [b for b in horizon if b["n"] and b["mae"]]
    if len(buckets) >= 2:
        first, last = buckets[0], buckets[-1]
        change = (last["mae"] / first["mae"] - 1) * 100
        if change > 10:
            out.append({"kind": "horizon", "text": f"Error grows with lead time: MAE rises from {_mw(first['mae'])} at {first['bucket']} ahead to {_mw(last['mae'])} at {last['bucket']} (+{change:.0f}%)."})
        else:
            out.append({"kind": "horizon", "text": f"Error is fairly flat across lead times ({_mw(first['mae'])} at {first['bucket']} vs {_mw(last['mae'])} at {last['bucket']})."})

    if len(daily) >= 2:
        ranked = sorted((d for d in daily if d["mae"] is not None), key=lambda d: d["mae"])
        best, worst_day = ranked[0], ranked[-1]
        fmt = lambda d: pd.Timestamp(d["date"]).strftime("%d %b")  # noqa: E731
        out.append({"kind": "day", "text": f"Worst day: {fmt(worst_day)} (MAE {_mw(worst_day['mae'])}, bias {worst_day['bias']:+,.0f} MW). Best day: {fmt(best)} (MAE {_mw(best['mae'])})."})

    if len(joined) >= 20:
        median = joined["actual_mw"].median()
        hi = joined.loc[joined["actual_mw"] >= median, "error_mw"].abs().mean()
        lo = joined.loc[joined["actual_mw"] < median, "error_mw"].abs().mean()
        if hi > lo * 1.15:
            out.append({"kind": "regime", "text": f"Errors are larger in windy periods: MAE {_mw(hi)} when output is above the median ({_mw(median)}) vs {_mw(lo)} below it."})
        elif lo > hi * 1.15:
            out.append({"kind": "regime", "text": f"Errors are larger in calmer periods: MAE {_mw(lo)} when output is below the median ({_mw(median)}) vs {_mw(hi)} above it."})
    return out
