/** End-to-end checks of the dashboard against the real API (numbers are compared with /api/metrics). */
import { type Page, expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const oneDp = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${int.format(Math.abs(v))}`;

const kpi = (page: Page, id: string) => page.getByTestId(`kpi-${id}`).getByTestId("kpi-value");

/** Collect console errors and uncaught exceptions for the page's lifetime. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

async function ready(page: Page) {
  await expect(kpi(page, "mae")).not.toHaveText("–");
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
}

/** KPI cards must show exactly what the API returns for these query params. */
async function expectKpisMatchApi(page: Page, params: string) {
  const res = await page.request.get(`/api/metrics?${params}&include_points=false`);
  expect(res.ok()).toBeTruthy();
  const m = (await res.json()).overall;
  await expect(kpi(page, "mae")).toHaveText(int.format(m.mae));
  await expect(kpi(page, "rmse")).toHaveText(int.format(m.rmse));
  await expect(kpi(page, "bias")).toHaveText(signed(m.bias));
  await expect(kpi(page, "mape")).toHaveText(oneDp.format(m.mape));
  await expect(kpi(page, "p90")).toHaveText(int.format(m.p90_abs_error));
}

test.beforeEach(async ({ context }) => {
  // Most tests don't need the first-visit guide.
  await context.addInitScript(() => localStorage.setItem("wfm-guide-dismissed", "1"));
});

test("loads without console errors and renders all charts with data", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await ready(page);
  // Below-the-fold charts render when scrolled near the viewport.
  await page.getByRole("heading", { name: "Day-by-day accuracy" }).scrollIntoViewIfNeeded();
  await expect(page.locator(".recharts-surface")).toHaveCount(3);
  await expect(page.locator(".recharts-line-curve")).toHaveCount(2); // actual + forecast
  await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(8); // 8 lead-time buckets
  expect(await page.locator(".recharts-line-curve").first().getAttribute("d")).toMatch(/^M[\d.]+/);
  await expect(page.getByRole("heading", { name: "Key insights" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("KPI cards match the API for the default selection", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await expectKpisMatchApi(page, "start=2026-01-02&end=2026-02-01&mode=cutoff&cutoff_hour=9&cutoff_minute=50");
});

test("changing dates, cutoff and horizon updates values and the URL", async ({ page }) => {
  test.slow(); // several refetches in one test
  await page.goto("/");
  await ready(page);

  await page.getByRole("button", { name: /Decision days/ }).click();
  await page.getByRole("button", { name: "8–14 Jan" }).click();
  await expect(page).toHaveURL(/start=2026-01-09&end=2026-01-15/);
  await expectKpisMatchApi(page, "start=2026-01-09&end=2026-01-15&cutoff_hour=9&cutoff_minute=50");

  await page.getByLabel(/Decision cutoff time/).fill("12:00");
  await expect(page.getByText("published by 12:00 UK time")).toBeVisible();
  await expect(page).toHaveURL(/cutoff=12%3A00/);
  await expectKpisMatchApi(page, "start=2026-01-09&end=2026-01-15&cutoff_hour=12&cutoff_minute=0");

  await page.getByRole("radio", { name: "Fixed horizon" }).click();
  const thumb = page.getByRole("slider", { name: "Forecast horizon in hours" });
  await thumb.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
  await expect(thumb).toHaveAttribute("aria-valuenow", "6");
  await expect(page).toHaveURL(/mode=horizon&h=6/);
  await expect(page.getByText("at least 6 hours before")).toBeVisible();
  await expectKpisMatchApi(page, "start=2026-01-09&end=2026-01-15&mode=horizon&horizon_hours=6");
});

test("date picker offers January 2026 decision days only and URLs outside scope are clamped", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: /Decision days/ }).click();
  await expect(page.getByRole("button", { name: /January 2026$/ })).toHaveCount(31);
  await expect(page.getByRole("button", { name: /Previous month/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Next month/ })).toBeDisabled();
  await page.getByRole("button", { name: "Saturday 10 January 2026" }).click();
  await page.getByRole("button", { name: "Monday 5 January 2026" }).click(); // end before start: swapped
  // Decisions 5-10 Jan -> delivery 6-11 Jan in the URL/API.
  await expect(page).toHaveURL(/start=2026-01-06&end=2026-01-11/);
  await expect(page.getByRole("button", { name: /Decision days/ })).toHaveText("5–10 Jan 2026");

  await page.goto("/?start=2025-12-01&end=2026-02-15");
  await ready(page);
  await expect(page.getByRole("button", { name: /Decision days/ })).toHaveText("1–31 Jan 2026");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("shared links restore the filters", async ({ page }) => {
  await page.goto("/?start=2026-01-15&end=2026-01-21&mode=horizon&h=12");
  await ready(page);
  await expect(page.getByRole("button", { name: /Decision days/ })).toHaveText("14–20 Jan 2026"); // decision days for delivery 15-21 Jan
  await expect(page.getByRole("radio", { name: "Fixed horizon" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("12 h", { exact: true })).toBeVisible();
  await expectKpisMatchApi(page, "start=2026-01-15&end=2026-01-21&mode=horizon&horizon_hours=12");
});

test("daily table renders, sorts and exports CSV", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const rows = page.locator("table tbody tr");
  await expect(rows).toHaveCount(31);
  await expect(rows.first().locator("th")).toHaveText("Fri 02 Jan");

  await page.getByRole("button", { name: "MAE (MW)" }).click(); // largest first
  await expect(rows.first().locator("th")).toHaveText("Wed 28 Jan");
  await expect(page.locator("th[aria-sort=descending]")).toHaveCount(1);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toBe("daily-metrics-2026-01-02_2026-02-01_cutoff-0950.csv");
  const lines = readFileSync(await download.path(), "utf8").trim().split("\n");
  expect(lines[0]).toBe("delivery_date,hours,mae_mw,rmse_mw,bias_mw,mape_pct,p90_abs_error_mw,max_abs_error_mw,mean_actual_mw,mean_forecast_mw");
  expect(lines).toHaveLength(32);
});

test("shows a skeleton while loading and an error state with working retry", async ({ page }) => {
  let fail = true;
  await page.route("**/api/metrics**", async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    if (fail) await route.fulfill({ status: 503, json: { detail: "Elexon data not loaded yet: loading" } });
    else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Loading dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "We couldn't load the data" })).toBeVisible();
  await expect(page.getByText("API error 503")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await ready(page);
});

test("shows an empty state when no forecast matches", async ({ page }) => {
  await page.route("**/api/metrics**", async (route) => {
    const body = await (await route.fetch()).json();
    body.overall = { ...body.overall, n: 0, mae: null, rmse: null, bias: null, mape: null, p90_abs_error: null };
    body.points = [];
    body.daily = [];
    await route.fulfill({ json: body });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "No forecasts match this selection" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset filters" }).last()).toBeVisible();
});

test("metric tooltips explain each KPI", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "What is MAE?" }).hover();
  await expect(page.getByRole("tooltip")).toContainText("typical size of a miss");
  await page.getByRole("button", { name: "What is Bias?" }).focus();
  await expect(page.getByRole("tooltip")).toContainText("forecast was too high");
});

test("brush zooms the time charts and can be reset", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const traveller = page.locator(".recharts-brush-traveller").first();
  const box = (await traveller.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 500, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  const reset = page.getByRole("button", { name: "Reset zoom" });
  await expect(reset).toBeVisible();
  await reset.click();
  await expect(reset).toBeHidden();
});

test("theme choice persists across reloads", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
});

test("first-visit guide can be dismissed and stays dismissed", async ({ browser, baseURL }) => {
  // Fresh context without the beforeEach script that pre-dismisses the guide.
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await page.goto("/");
  const guide = page.getByRole("heading", { name: "How to read this dashboard" });
  await expect(guide).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(guide).toBeHidden();
  await page.reload();
  await ready(page);
  await expect(guide).toBeHidden();
});

test.describe("phone (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("layout fits the screen; table scrolls inside its card", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    const table = page.getByRole("region", { name: /Daily metrics table/ });
    expect(await table.evaluate((el) => el.scrollWidth > el.clientWidth)).toBeTruthy();
    await expect(page.getByRole("heading", { name: "Wind Forecast Monitor" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
