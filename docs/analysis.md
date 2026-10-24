# January 2026 wind forecast accuracy: summary

**Question:** How accurate was the GB wind forecast that a day-ahead buyer could actually use?

**Method:** For each hour in January 2026 we took the latest Elexon WINDFOR forecast published by **09:50 London time the day before** (the 09:30 run) and compared it with metered wind output (FUELHH, WIND). That gives 744 hourly comparisons. Error = forecast − actual.

## Headline numbers (D-1 09:50 forecast)

| Metric | Value | In plain terms |
|---|---|---|
| Mean wind output | 11,581 MW | Range 1.7-17.8 GW |
| MAE | **2,107 MW** | Typical miss, about 18% of mean output |
| Bias | **+1,840 MW** | Forecast too high by 16% on average |
| RMSE | 2,611 MW | RMSE/MAE = 1.24: errors are fairly consistent, not driven by a few outliers |
| MAPE | 21.9% | Inflated on calm days; MAE and P90 are better for sizing |
| P90 absolute error | **4,377 MW** | 9 in 10 hours missed by less than this |
| Largest miss | +6,857 MW | 12 Jan 01:00 |

## Findings

1. **The forecast is systematically too high.** 84% of hours were over-forecast, and the average excess was 1.8 GW. The *shape* is good: forecast and actual move together closely (correlation 0.93), so the forecast gets the timing of wind changes right but the *level* wrong.

2. **The higher the forecast, the bigger the over-forecast.** In the quarter of hours with the highest forecasts (averaging 19.3 GW), *every* hour was over-forecast, by 3.5 GW on average. Actual output never exceeded 17.8 GW in January, while forecasts peaked above 21 GW. Two plausible causes, which we could not test with the permitted data:
   - wind farms being turned down for grid constraints (FUELHH records what was actually generated);
   - FUELHH and WINDFOR covering slightly different sets of wind farms.

3. **Error grows with lead time.** Across all forecast runs, MAE rises from 1,768 MW at 0-6 h ahead to 2,409 MW at 42-48 h ahead (+36%). The forecasts used at the 09:50 cutoff are 14.5-37.5 h ahead, in the middle of that range.

4. **Deciding a day ahead costs about 15% in accuracy.** The latest forecast available just before delivery has an MAE of 1,794 MW, versus 2,107 MW at the D-1 cutoff. Moving the cutoff changes little within the morning: 06:00 or 08:00 gives 2,128 MW; anything from 09:30 to 11:29 gives 2,107 MW (no new run in between); 12:00 picks up the 11:30 run and gives 2,003 MW (−5%).

5. **Accuracy varies widely by day.**
   - Worst: 28 Jan (MAE 5,329 MW, every hour over-forecast), 11 and 12 Jan (~4,900 MW), 1 Jan (4,274 MW).
   - Best: 19 Jan (750 MW).
   - On 7 days the average error exceeded 3 GW. By week, MAE ranged from 1,544 MW (15-21 Jan) to 2,367 MW (22-31 Jan).

6. **Windy periods are riskier.** MAE was 2,474 MW when output was above the 12.2 GW median, versus 1,740 MW below it.

## What this means for the buying desk

- **Treat the raw D-1 wind forecast as an upper estimate**, especially when it shows more than about 17 GW.
- **A simple correction looks valuable but needs validation.** On January data, removing the average bias would have cut MAE by about 31%, and scaling the forecast by 0.86 by about 42%. Both figures are fitted on the same month they are scored on, so they are optimistic. Test any correction on other months before using it.
- **Size the day-ahead wind risk buffer at roughly ±4.4 GW (P90)**, and wider on windy days.
- **Plan to re-balance intraday.** Fresher forecasts are about 15% more accurate than the one available at the 09:50 cutoff.

## Caveats

This covers one winter month only, at hourly resolution (the forecast is hourly). It assumes the brief's 09:50 D-1 decision time. The possible definitional gap between FUELHH and WINDFOR is described above and should be checked before acting on the bias numbers.
