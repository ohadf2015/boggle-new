# Google Play — Declare Trader Status

**Status:** action required, human-only
**Date:** 2026-11-16
**Deadline:** 1 Feb 2027

## What

Google Play requires every developer account to declare trader vs non-trader status.
Missing the deadline risks Google blocking app updates and removing the app worldwide.

LexiClash (`live.lexiclash.app`) has ads + in-app purchases → **trader**, not non-trader.

## Where

Play Console → Manage account → Account details → About you.

Policy: https://support.google.com/googleplay/android-developer/answer/17594752?hl=en

## Why this can't be automated

No agent/service-account API covers this declaration — it's a console form a human
account owner must fill in. Do not attempt to file it via Playwriter, the Play Developer
API, or any other automation.

## Backup reminder

A cron job (`8190db46ac8b`) fires 18 Jan 2027 09:00 Israel time as a fallback if this
hasn't been done by then. Tracking card: `t_ca61a8c3`.

## Related, no action needed tonight

The Play review-request sheet (1-win, 45-day throttle) has never emitted
`native_review_*` events in PostHog. The only native winner since the 13 Nov deploy is
still inside that throttle window, so a single lifetime rating isn't proof the sheet is
broken — re-check once a second winner clears the throttle. Store listing titles are live
(Word Hunt Online / משחק מילים בעברית); the card remains starless, which is the current
4.1k-install → 2-review leak.
