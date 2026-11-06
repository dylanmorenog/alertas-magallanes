# Alertas Magallanes

Weather alert system for the residents of Sánchez Magallanes, Tabasco, Mexico.

## The problem

Sánchez Magallanes is a small fishing town in Tabasco, Mexico. Bad weather hits
it hard because many houses are close to the shore. Today, people find out about
storms through Facebook, in person, or by word of mouth, and at most one day ahead.

This matters to me because it's the place where I grew up, and because recent
storms left people out of work. When I visited the town, I saw destroyed ramadas
(palm-roofed shelters) and trash everywhere.

## What I learned from the community

My original idea was to tell people who go out on the lagoon whether conditions
were safe. But after looking into it, I realized that the people who work on the
lagoon already know when they can go out and when they can't. So I refocused the
project on the town's families and neighbors, so they can find out days in
advance and prepare before a tragedy happens.

## How it works

The data comes from Open-Meteo, and the site updates every 30 minutes. It checks
daily rainfall, 3-day accumulated rainfall, wind gusts, and wave height. Each
day's color (green, yellow, or red) is decided by thresholds. Days further out
say "may change," to warn that the forecast isn't final yet. It also generates a
message ready to post on Facebook, the platform people in town use the most.

Stack: Next.js, TypeScript, and Railway.

## Decisions I made

**What if data is missing?** If Open-Meteo doesn't send, for example, wave data,
I could ignore it, mark the day yellow just in case, or calculate with the data
that did arrive and show that information is missing. I chose the last one:
marking yellow every time data is missing would cause false alarms, and people
stop trusting a warning system that is often wrong.

**Severity and uncertainty, kept separate.** At first, yellow said "there may be
bad weather," but that mixes up "it's moderate" with "it's not certain." Now the
headline only says how severe it is, and "may change" only appears when the
forecast is far out.

**Not adding what isn't needed.** I was going to store a history of forecasts in
a database, but Open-Meteo already archives its forecasts, so I can rebuild what
the app showed. I postponed it until I have a real reason.

## Does it work? Backtesting

I backtested the rules: I ran them on data from a recent norte (a strong
cold-front storm), Cold Front No. 2 in October 2026, to see what the app would
have done. It would have warned 4 days ahead, still marked "may change," and
2 days ahead with a reliable forecast. Today, people find out one day ahead at most.

I also found a problem: with the current thresholds, there would be 9.2 red
alerts per year, which is too many. I haven't adjusted them yet because I only
have two events to compare, and any number I choose would just fit those two.
To know which events really matter, I need to test it against more events.

## Limitations

- Wind isn't measured exactly at the town, and the models don't agree with each other.
- The waves come from the Gulf of Mexico and aren't the same as on the lagoon, so
  they are hard to measure.
- It's for information only and does not replace Civil Protection (Protección
  Civil) or the Port Authority (Capitanía de Puerto).

## How I built it

I programmed it with Claude Code as an assistant. The design decisions, the
community research, and the validation were mine.

## What's next

- Talk to more people in town to validate the wording and the thresholds.
- Adjust the thresholds using more events.
- A monitor that keeps the site always up to date.

Data: Open-Meteo.com
