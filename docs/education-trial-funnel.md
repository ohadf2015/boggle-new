# Education trial → Pro funnel: what to read, and the baseline

How to tell whether the trial experience makes teachers want Pro. Events are PostHog; filter every
query by `$host` (the project is shared) and drop `@lexiclash.test` accounts (`profiles.is_test_account`).

## What a free teacher in their 14-day access trial gets
All five Pro surfaces open (analytics, reports, word mastery, missed-word practice, pressure dials),
a strip on each showing days left and their own games/students, and an upgrade button. At expiry the
surfaces lock again; the expiry banners recap what they ran and say what stays free. The card-backed
Polar 14-day trial is offered on the results screen, at signup and on the HQ banner.

## The funnel, in order
| Step | Event | Properties |
|---|---|---|
| Sees a Pro surface during the trial | `pro_trial_preview_viewed` | `feature`, `days_left` |
| Taps upgrade in the strip | `pro_trial_preview_upgrade_clicked` | `feature`, `days_left` |
| Checkout opens | `edu_pro_upgrade_clicked` → `checkout_open` | `source` |
| Pays | `checkout_complete` (fires on `order.paid`, not at session creation) | |
| Hits a lock AFTER the trial | `pro_gate_viewed` | `feature` |
| Sees the expiry recap | `trial_expired_shown` | `source` |

`pro_gate_viewed` is deliberately NOT fired during a preview, so "previewing" and "locked out" are
separate numbers. Read conversion by `days_left` (does urgency near day 14 convert?) and by `feature`
(which surface sells).

## Baseline, 2026-10-20 (production, test accounts excluded)
- 80 approved teachers; 17 with a live access trial (the first cohort to get the preview)
- 3 Pro rows, 1 paying
- Live-game activity, last 30 days: 8 teachers, 16 games (the public social-proof line)

## When to judge
Re-run after one full trial cycle (14 days) on the cohort that had the preview. A lift is
(`checkout_complete` from preview viewers) / (distinct preview viewers). With ~17 teachers per cycle,
a single conversion is a large swing: treat anything under ~3 conversions as noise, not a result.
