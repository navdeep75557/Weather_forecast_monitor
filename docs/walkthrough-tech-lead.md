# Tech lead walkthrough: Wind Forecast Monitor (about 5 minutes)

*Audience: engineering lead reviewing the codebase. Have the repo, the live app and `/docs` (Swagger) open.*

---

**[0:00 – What it is, 30 s]**

A FastAPI backend and a React/TypeScript frontend. It answers one question: for each delivery hour bought by a January 2026 decision, what was the latest Elexon wind forecast available at the 09:50 D-1 decision time, and how accurate was it? Decisions on 1-31 Jan mean delivery 2 Jan - 1 Feb. Layout: `backend/`, `frontend/`, `docker-compose.yml`, `vercel.json`, `.github/workflows` and the README.

**[0:30 – Data layer, 50 s]**

`elexon.py` wraps two BMRS stream endpoints: **FUELHH** filtered to WIND by settlement date, and **WINDFOR** by publish time. Requests are chunked by week. Retries use exponential backoff with jitter on 429, 5xx and network errors; other 4xx responses fail fast with a typed `ElexonError`.

Everything is normalised to tz-aware UTC and de-duplicated. `data_store.py` loads a gzipped JSON snapshot committed under `backend/data`, about 110 KB, because this is final data. So the API starts instantly and doesn't depend on Elexon being up. `python -m app.refresh` rebuilds it. If loading fails, `/api/health` reports degraded and the data endpoints return 503 with the reason.

**[1:20 – Core logic, 1 min]**

`forecasting.py` is the heart of it, and both modes reduce to one function, `select_latest(forecasts, cutoff_by_target)`: join a per-target cutoff, keep `publish_time <= cutoff`, take the latest per target. It's vectorised pandas.

- **Cutoff mode:** HH:MM London on D-1, built from naive wall-clock time and then localised, so daylight-saving days are right. A test compares it with an independent zoneinfo implementation for every hour of 2026.
- **Horizon mode:** the cutoff is `start_time - H`.

Four choices change the numbers, and each was signed off:
- an exact-hour join (WINDFOR is hourly, FUELHH half-hourly);
- error = forecast − actual;
- lead-time analysis over all runs;
- the decision-month scope.

`metrics.py` computes MAE, RMSE, bias, zero-guarded MAPE and P90, overall, per day and per lead-time bucket. `insights.py` turns those into plain-English findings.

**[2:20 – API, 40 s]**

These are the five endpoints from the brief, with Pydantic models, so Swagger is accurate. Inputs are validated with clear 422s; for example, dates outside 2 Jan - 1 Feb are rejected. Because the data is immutable, every response is validated and serialised once per query and kept in an LRU cache: a cached metrics call takes about 10 ms. Responses are gzipped (the metrics payload goes from 120 KB to 14 KB) and carry `s-maxage`, so Vercel's CDN serves repeat queries. The data store also loads lazily, because serverless runtimes may skip the startup hook.

**[3:00 – Frontend, 50 s]**

The stack is Vite, React 19 and strict TypeScript, with Tailwind and Radix primitives for the UI and Recharts for the charts.
- **Data:** `useDashboard` fetches in parallel with an `AbortController`, keeps the previous data visible while refetching, and applies results in a React transition, so chart rendering doesn't block input.
- **Shareable state:** filters live in the URL. The picker selects January decision days, and the API works in delivery dates.
- **Load speed:** chart code is lazy-loaded, and below-the-fold charts render only near the viewport.
- **Accessibility:** colours passed a colour-vision-deficiency check in both themes, and Lighthouse accessibility scores 100.

**[3:50 – Quality, 40 s]**

- **47 pytest tests** cover selection boundaries, DST, metrics, edge cases (zero actuals, empty ranges, Elexon outages and timeouts), caching and client retries.
- **`qa/verify_elexon.py`** re-implements selection and metrics without importing the app, from raw Elexon data, and diffs against a running API. It also asserts that every decision-time forecast was published in January.
- **13 Playwright tests** run against the production build, and against the live site.

**[4:30 – Delivery, 30 s]**

`vercel.json` declares two Vercel services, Vite at `/` and FastAPI at `/api`, so they share an origin. Every push to `main` deploys, and a warm-up workflow wakes the new deployment. A second workflow builds the Docker Compose stack (with nginx proxying `/api`) and runs the e2e suite against it. Next steps: extend beyond January, add a scheduled refresh, and investigate the over-forecast bias. That last one needs curtailment data beyond this brief.
