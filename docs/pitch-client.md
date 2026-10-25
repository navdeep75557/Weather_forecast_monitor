# Client pitch: Wind Forecast Monitor (about 5 minutes)

*Audience: head of trading and the day-ahead power buying team. Open the live app on the default view: "All of January" decisions, Decision cutoff 09:50. Dismiss the "How to read" guide first, or use it in the opening.*

---

**[0:00 – Opening, 30 s]**

Every morning before 09:50 your team commits to tomorrow's power position, and the biggest unknown in that decision is wind. Across the January decisions we studied, GB wind swung from under 2 GW to nearly 18 GW. So the question for this pilot was simple. When you made each call, how good was the wind forecast in front of you, and how far should you trust it?

**[0:30 – The problem, 40 s]**

Most forecast-accuracy reports flatter the forecast without meaning to. They score the *latest* forecast, published hours before delivery, but that forecast didn't exist when you had to decide.

*(Point to the filter bar and the line under it.)* This tool only uses the forecast you could actually have seen. You pick the days you made decisions, here every day in January, and for each delivery hour the next day it takes the latest Elexon forecast published by 09:50 on the decision day. Then it compares that with what the wind fleet actually generated.

**[1:10 – The headline numbers, 50 s]**

*(Point to the KPI cards; hover the "i" on Bias.)* The typical miss is about 2 GW, roughly 18% of average output. The bias is plus 1.7 GW: on average the forecast promised 1.7 GW more wind than turned up, and in 84% of hours it was too high.

*(Point to P90.)* For risk sizing, this is the number to remember: in 9 out of 10 hours the forecast was within about 4.2 GW. That's a sensible starting point for how much wind risk to cover day-ahead.

**[2:00 – The chart, 50 s]**

*(Point to the hero chart.)* The black line is what the wind actually did; blue is the forecast you had at 09:50 the day before. The shape lines up well, so the forecast catches the timing of wind fronts. But the blue shading shows where it was too high, and there's far more blue than amber.

*(Drag the brush onto 10-13 Jan; the error chart below follows.)* You can zoom into any period. Overnight into 12 January, the forecast was nearly 7 GW too high, the kind of miss that becomes an expensive imbalance position.

**[2:50 – Insights that change behaviour, 1 min]**

*(Point to Key insights.)* The app writes up the takeaways in plain English. Three matter most for the desk.

First, **be most sceptical when the forecast is high**. When the D-1 forecast was in its top quarter, above about 17.7 GW, it was too high in every single hour, by 3.3 GW on average.

Second, **deciding a day ahead has a measurable cost**. *(Point to the lead-time chart.)* Error grows steadily with lead time, about 40% from 6 hours ahead to 2 days ahead. The freshest forecast is about 16% more accurate than the one you have at 09:50. That's the value of keeping flexibility for intraday.

Third, **the bias looks systematic, so it may be correctable**. On this data, a simple adjustment would have cut the typical error by around a third. We'd validate that on other months before anyone relies on it.

**[3:50 – Flexibility and trust, 50 s]**

*(Change the cutoff to 12:00, then switch to Fixed horizon and drag the slider to 6 h and 36 h.)* If your decision time changes, or you want to know how good a 6-hour or 36-hour forecast is, every number updates. Every view has its own shareable link.

*(Scroll to the table; sort by MAE; click Export CSV.)* The day-by-day table shows your worst days at a glance, and exports to CSV so your analysts can use it in their own models. It works in light and dark mode and on a phone.

Everything comes from Elexon's public data. Every number has been checked against an independent recalculation, and the logic is covered by automated tests.

**[4:40 – Close, 20 s]**

So: a clear, honest view of the forecast you actually trade on, how wrong it tends to be, and in which direction. The natural next step is to extend this beyond January and test a bias correction, so the desk can turn this insight into better day-ahead positions. Happy to take questions.
