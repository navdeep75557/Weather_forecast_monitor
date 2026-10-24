# Client pitch: Wind Forecast Monitor (about 5 minutes)

*Audience: head of trading and the day-ahead power buying team. Have the app open on the full-month view with the D-1 09:50 cutoff.*

---

**[0:00 – Opening, 30 s]**

Every morning before 09:50 your team commits to tomorrow's power position. The biggest unknown in that decision is wind: in January, GB wind swung from under 2 GW to nearly 18 GW. So the question we set out to answer is simple. When you made that call, how good was the wind forecast in front of you, and how far should you trust it?

**[0:30 – The problem, 45 s]**

Most forecast-accuracy reports cheat without meaning to. They score the *latest* forecast, published hours before delivery, but that forecast didn't exist when you had to decide. That flatters the forecast and understates your real risk.

This tool only uses the forecast you could actually have seen: for every hour of tomorrow, the latest Elexon forecast published by 09:50 today. It then compares that with what the wind fleet actually generated.

**[1:15 – Walk the dashboard, 1 min 30 s]**

*(Point to the main chart.)* Blue is what the wind actually did; orange is the forecast you had at 09:50 the day before. The shape lines up well, so the forecast catches the timing of wind fronts. But look at the gap: orange sits above blue most of the month.

*(Point to the tiles.)* That shows up in the numbers. The typical miss is about 2.1 GW, roughly 18% of average output. The bias is plus 1.8 GW: on average the forecast promised 1.8 GW more wind than turned up. In 84% of hours, the forecast was too high.

*(Point to P90.)* For risk sizing, this is the number to remember: in 9 out of 10 hours the forecast was within about 4.4 GW. That's a sensible starting point for how much wind risk to cover day-ahead.

*(Drag the brush onto 10-13 Jan.)* You can zoom into any period. Around 11 and 12 January, the forecast was more than 6 GW too high overnight, the kind of miss that becomes an expensive imbalance position.

**[2:45 – Insights that change behaviour, 1 min 15 s]**

*(Point to Key insights.)* The app writes up the takeaways in plain English. Three matter most for the desk.

First, **be most sceptical when the forecast is high**. When the D-1 forecast was in its top quarter, it was too high in every single hour, by 3.5 GW on average.

Second, **deciding a day ahead has a measurable cost**. *(Point to the lead-time chart.)* Error grows steadily with lead time, and the freshest forecast is about 15% more accurate than the one you have at 09:50. That is the value of keeping flexibility for intraday.

Third, **the bias looks systematic, so it may be correctable**. On January data, a simple adjustment would have cut the typical error by around a third. We'd validate that on other months before anyone relies on it.

**[4:00 – Flexibility and trust, 40 s]**

*(Switch to Fixed horizon, slide to 6 h and then 36 h.)* If your decision time changes, or you want to know how good a 6-hour or 36-hour forecast is, change the cutoff or the horizon and every number updates. The day-by-day table exports to CSV, so your analysts can take it straight into their own models.

Everything comes from Elexon's public data, every number can be traced, and the logic is covered by automated tests.

**[4:40 – Close, 20 s]**

So: a clear, honest view of the forecast you actually trade on, how wrong it tends to be, and in which direction. The natural next step is to extend this beyond January and test a bias correction, so the desk can turn this insight into better day-ahead positions. Happy to take questions.
