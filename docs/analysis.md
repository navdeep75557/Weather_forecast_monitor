# Wind forecast accuracy for January 2026 buying decisions: summary

**Question:** How accurate was the GB wind forecast a day-ahead buyer could actually use when making purchase decisions in January 2026?

**Method:** Each buying decision is made on day D-1 for delivery on day D, so decisions made on 1-31 January cover delivery on **2 January - 1 February 2026**. For every delivery hour we took the latest Elexon WINDFOR forecast published by **09:50 London time on the decision day**; in practice that is always the 09:30 run. We compared it with metered wind output (FUELHH, WIND), giving 744 hourly comparisons. Every forecast used was published between 1 Jan 09:30 and 31 Jan 09:30. Error = forecast − actual.

## Headline numbers (D-1 09:50 forecast)

| Metric | Value | In plain terms |
|---|---|---|
| Mean wind output | 11,286 MW | Range 1.7-17.8 GW |
| MAE | **1,996 MW** | Typical miss, about 18% of mean output |
| Bias | **+1,728 MW** | Forecast too high by 15% on average |
| RMSE | 2,499 MW | RMSE/MAE = 1.25: errors are fairly consistent, not driven by a few outliers |
| MAPE | 21.4% | Inflated on calm days; MAE and P90 are better for sizing |
| P90 absolute error | **4,184 MW** | 9 in 10 hours missed by less than this |
| Largest miss | +6,857 MW | Mon 12 Jan 01:00 |

## Findings

1. **The forecast is systematically too high.** 84% of hours were over-forecast, and the average excess was 1.7 GW. The *shape* is good: forecast and actual move together closely (correlation 0.93), so the forecast gets the timing of wind changes right but the *level* wrong.

2. **The higher the forecast, the bigger the over-forecast.** In the quarter of hours with the highest forecasts (above 17.7 GW, averaging 19.1 GW), *every* hour was over-forecast, by 3.3 GW on average. Actual output never exceeded 17.8 GW, while forecasts peaked at 21.3 GW. Two plausible causes, which we could not test with the permitted data:
   - wind farms being turned down for grid constraints (FUELHH records what was actually generated);
   - FUELHH and WINDFOR covering slightly different sets of wind farms.

3. **Error grows with lead time.** Across all forecast runs for these delivery days, MAE rises from 1,654 MW at 0-6 h ahead to 2,319 MW at 42-48 h ahead (+40%). The forecasts available at the 09:50 decision are 14.5-37.5 h ahead, in the middle of that range.

4. **Deciding a day ahead costs about 16% in accuracy.** The latest forecast available just before delivery has an MAE of 1,680 MW, versus 1,996 MW at the D-1 cutoff. Moving the decision time within the morning changes little:
   - 06:00 gives 2,003 MW and 08:00 gives 2,023 MW;
   - anything from 09:30 to 11:29 gives 1,996 MW, because there is no new run in between;
   - 12:00 picks up the 11:30 run and gives 1,884 MW (−6%).

5. **Accuracy varies widely by day.**
   - Worst delivery days: 28 Jan (MAE 5,329 MW), 11 and 12 Jan (~4,900 MW), 21 Jan (3,862 MW). Every hour of each was over-forecast.
   - Best: 19 Jan (750 MW).
   - On 6 days the average error exceeded 3 GW. By week of decisions, MAE ranged from 1,761 MW (15-21 Jan) to 2,188 MW (22-31 Jan).

6. **Windy periods are riskier.** MAE was 2,316 MW when output was above the 11.4 GW median, versus 1,675 MW below it.

## What this means for the buying desk

- **Treat the raw D-1 wind forecast as an upper estimate**, especially when it shows more than about 17-18 GW.
- **A simple correction looks valuable but needs validation.** On this data, removing the average bias would have cut MAE by about 30%, and scaling the forecast by 0.87 by about 41%. Both figures are fitted on the same period they are scored on, so they are optimistic. Test any correction on other months before using it.
- **Size the day-ahead wind risk buffer at roughly ±4.2 GW (P90)**, and wider on windy days.
- **Plan to re-balance intraday.** Fresher forecasts are about 16% more accurate than the one available at the 09:50 decision.

## Caveats

This covers one winter month of decisions only, at hourly resolution (the forecast is hourly). It assumes a 09:50 D-1 decision time. The possible definitional gap between FUELHH and WINDFOR is described above and should be checked before acting on the bias numbers.
