# Tech lead walkthrough: Wind Forecast Monitor (about 5 minutes)

*Audience: engineering lead reviewing the codebase. Have the repo and `/docs` (Swagger) open.*

---

**[0:00 – What it is, 30 s]**

A FastAPI backend and a React/TypeScript frontend. It answers one question: for each January 2026 hour, what was the latest Elexon wind forecast available at the day-ahead decision time, and how accurate was it? Repo layout is `/backend`, `/frontend`, `docker-compose.yml`, `render.yaml` and the README.

**[0:30 – Data layer, 1 min]**

`elexon.py` wraps two BMRS stream endpoints:
- **FUELHH**, filtered to `fuelType=WIND`, by settlement date;
- **WINDFOR**, by publish time.

I chunk requests by week, as the brief asked, even though the API coped with a month. Retries use exponential backoff with jitter on 429, 5xx and network errors, and other 4xx responses fail fast with a typed `ElexonError`.

Normalisation converts everything to tz-aware UTC and de-duplicates. For FUELHH the latest publish per `startTime` wins; WINDFOR is de-duplicated on (`publishTime`, `startTime`).

`data_store.py` caches in memory and in a gzipped JSON snapshot committed under `backend/data`, about 110 KB. January 2026 is final data, so the deployed API starts instantly and doesn't depend on Elexon being up. `python -m app.refresh` or `REFRESH_ON_STARTUP=true` rebuilds it. If loading fails, the API still starts: `/api/health` reports degraded and data endpoints return 503 with the reason.

**[1:30 – Core logic, 1 min 15 s]**

`forecasting.py` is the heart of it, and both modes reduce to one function: `select_latest(forecasts, cutoff_by_target)`. It joins a per-target cutoff, filters `publish_time <= cutoff`, and takes the `idxmax` of publish time per target. Everything is vectorised in pandas.

- **Cutoff mode:** the cutoff is HH:MM London on D-1. I build it from *naive wall-clock time* and then localise to Europe/London, so DST days are correct. Tests cover the March and October 2026 transitions, including a 23:30 UTC target that falls on the next London date.
- **Horizon mode:** the cutoff is `start_time - H`.

Three choices change the numbers, and the product owner signed off on each:
- **exact-hour join** (WINDFOR is hourly, FUELHH half-hourly; no interpolation);
- **error = forecast − actual**;
- **lead-time analysis over all forecast runs**, not just the selected ones.

`metrics.py` computes MAE, RMSE, bias, MAPE (skipping near-zero actuals), P90 and max error, overall and per London day and lead-time bucket. `insights.py` turns those into plain-English findings, including a comparison against the freshest forecast to quantify the cost of deciding a day ahead.

**[2:45 – API surface, 30 s]**

The five endpoints are the ones in the brief. Query params are validated with FastAPI and Pydantic, and dates are restricted to January 2026 with a clear 422. Response models live in `models.py`, so Swagger is accurate. CORS takes an explicit origin list plus an optional regex for Vercel preview URLs. The full metrics payload is about 120 KB and returns in roughly half a second.

**[3:15 – Frontend, 50 s]**

Vite, React 19, TypeScript in strict mode, Recharts. `useDashboard` fetches the three resources in parallel with an `AbortController`. It keeps the previous data on screen at reduced opacity while refetching, and shows a "waking up" message if the free-tier backend is cold. Controls are debounced.

The brush on the main chart drives a shared time window, so the error chart zooms with it. The lead-time chart highlights the buckets the current selection actually uses. Chart colours were run through a colour-vision-deficiency validator in light and dark mode. The daily table sorts and exports daily and hourly CSV.

**[4:05 – Quality and delivery, 35 s]**

- **Tests:** 35 pytest tests cover selection (boundaries, inclusivity, DST, missing forecasts), metric values, bucketing, the API against the real snapshot, and client retry and chunking with `httpx.MockTransport`.
- **Frontend checks:** a type-check and production build, plus an automated browser pass for console errors, mobile overflow, brush, mode switching, CSV and error states.
- **Delivery:** Dockerfiles for both services, with nginx proxying `/api` in compose. Render runs the API (blueprint included) and Vercel the frontend.

**[4:40 – Trade-offs and next steps, 20 s]**

The snapshot approach trades freshness for speed and resilience, which is fine for a fixed month. Next steps:
- generalise the scope beyond January;
- add a scheduled refresh;
- add frontend unit tests;
- investigate whether the strong over-forecast bias comes from curtailment or a difference in coverage between FUELHH and WINDFOR. That needs data beyond this brief's scope.
