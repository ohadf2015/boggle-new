# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured for the LexiClash project. Session Replay, Error Tracking, and Support were already enabled; the browser `posthog.init` preserves replay and exception capture. Native Self-driving signal sources for health checks, Error Tracking, and Support were already enabled.

Fresh scouts will be picked up within about 30 minutes. Findings will appear in the [Self-driving inbox](https://eu.posthog.com/project/151059/inbox) once they have enough corroboration.

## AI data processing

Approved.

## GitHub

The PostHog GitHub App was already connected before this setup. GitHub Issues was not selected as a Self-driving responder, so no GitHub Issues warehouse source or responder was added.

## Products enabled

| Product | Result | Notes |
| --- | --- | --- |
| Session Replay | Already enabled | Web recordings are flowing. Client initialization has no disabling override. |
| Error Tracking | Already enabled | Client exception capture is enabled. |
| Support (Conversations) | Already enabled | Tickets require an inbound email, inbox, or Slack channel before they can arrive. |

## Signal sources

| Signal source | Result | Notes |
| --- | --- | --- |
| `signals_scout` / `cross_source_issue` | Enabled by default | No source row is required; enabled scouts can emit to the inbox. |
| `health_checks` / `health_issue` | Already enabled | Existing responder retained. |
| `error_tracking` / `issue_created` | Already enabled | Existing responder retained. |
| `error_tracking` / `issue_reopened` | Already enabled | Existing responder retained. |
| `error_tracking` / `issue_spiking` | Already enabled | Existing responder retained. |
| `conversations` / `ticket` | Already enabled | Remains dormant until a Support channel is connected. |
| Replay Vision | Not configured as a source row | Scanner-level `emits_signals` is the authorizing control; no `replay_vision` source row was created. |

## Connected tools

No external tool responders were authorized in this run. Sentry was detected in the codebase but was not selected. GitHub Issues, Linear, Jira, and Zendesk were also not selected.

## Scout troop

The troop is within the recommended ten-scout ceiling. The verified budget is **100 runs/day**; **3 runs** had been used today, leaving **97**. Early-access banner: “Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more.”

### Active scouts (10)

| Scout | What it watches |
| --- | --- |
| `signals-scout-general` | Cross-product correlations and otherwise uncovered product surfaces. |
| `signals-scout-product-analytics` | Product funnels, lifecycle, retention, and saved-flow regressions. |
| `signals-scout-web-analytics` | Web traffic, acquisition channels, landing-page health, bounce, and 404 patterns. |
| `signals-scout-feature-flags` | Flag evaluation cliffs, distribution shifts, and flag debt. |
| `signals-scout-surveys` | Survey response volume, scores, targeting drift, and recurring feedback themes. |
| `signals-scout-revenue-analytics` | Revenue-data and billing-health regressions. |
| `signals-scout-room-lifecycle` | Multiplayer room creation, joins, game starts, and abandonment by entry path or mode. |
| `signals-scout-share-referral-loop` | Sharing, referral openings, and referred-room conversion. |
| `signals-scout-signup-prompt-delivery` | Signup prompt delivery and guest-to-account conversion. |
| `signals-scout-daily-challenge-availability` | Daily game availability and completion health by mode and locale. |

### Disabled scouts

23 scouts remain disabled because their product surface is not actively used, is lower priority, or is covered through a dedicated route. In particular, `signals-scout-error-tracking` is covered by the native Error Tracking responder and `signals-scout-session-replay` is covered by Replay Vision scanners when configured. The two previously active catalog-reconciliation scouts were disabled because their merchant-catalog scope does not match this game product.

Other disabled specialists can be enabled later from the inbox if the corresponding product is adopted, including AI observability, APM, Conversations, CSP violations, customer analytics, data pipelines, data warehouse, experiments, logs, web vitals, anomaly detection, health-check analysis, inbox validation, and Replay Vision trend analysis.

## Custom scouts

Both proposed scouts were approved and created. Their configurations were materialized with daily schedules, emitting enabled.

| Scout | Surface and discriminator | Why it is distinct |
| --- | --- | --- |
| `signals-scout-signup-prompt-delivery` | Detects sustained drops in signup-prompt impressions or guest-to-account conversion while completed-game activity remains healthy. | The product-analytics scout watches saved-flow conversion rates; this additionally catches prompt-entry volume disappearing. It follows `components/auth/SignupPromptHost.tsx` and `hooks/useMultiplayerSignupNudge.ts`. |
| `signals-scout-daily-challenge-availability` | Detects a daily mode or locale going quiet, or its completion rate materially falling, while the daily hub or peer modes remain active. | Generic funnel monitoring may not fire for a silent individual daily route. It follows `components/daily/DailyChallengeGame.tsx` and `components/daily/WordWheelGame.tsx`. |

The multiplayer room lifecycle and referral loop were already covered by active custom scouts, so no duplicate candidates were proposed. Error bursts and session-replay friction were ruled out because native Error Tracking and Replay Vision are their dedicated routes.

If either custom scout becomes noisy, set its configuration’s `emit` field to `false` in PostHog to run it in dry-run mode without sending reports to the inbox.

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes qualifying findings to the inbox. It is the only part of this setup that spends Replay Vision quota; findings have half weight and need corroboration before becoming a report.

| Brief | Planned name and scope | Estimate | Result |
| --- | --- | --- | --- |
| Breakage monitor | **LexiClash multiplayer breakage** — recordings whose URL contains `/multiplayer`, the core join/create/lobby-to-game completion journey from `app/[locale]/multiplayer/useMultiplayerJoin.ts`. | 497 observations/month at 0.5 sampling; 2,485 credits/month. | Skipped by approval decision. |
| Frustration monitor | **LexiClash player frustration** — recordings with the `$rageclick` event only, with no URL filter to avoid widening scanner overlap. | 257 observations/month at 1.0 sampling; 1,285 credits/month. | Skipped by approval decision. |

Replay is recording, but the monitors were not created because their combined estimate was 3,770 credits/month. With 2,480 credits remaining in the current period, 1,500 credits/month already projected by two existing unrelated scanners, and 23 days remaining, the combined projected load was about 4,040 credits for the remainder of the period. Existing catalog-scanning monitors were left unchanged.

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog if Support tickets should become Self-driving findings.
- [ ] Revisit the two Replay Vision monitor proposals after the credit period resets, or first pause/reduce the existing unrelated scanners, then create the scoped LexiClash monitors from the estimates above.
- [ ] Reauthorize the PostHog MCP connection with `property_definition:read` if direct event-schema validation is needed for future custom-scout refinement.

## What happens next

The scout coordinator should pick up the eight retained or newly created product-focused scouts within about 30 minutes. Scout runs draw from the verified 100-runs/day budget and cluster corroborated findings into reports in the Self-driving inbox; immediately actionable reports can then open coding tasks.

## Files modified

- Created `posthog-self-driving-report.md`.
- No application source files, environment files, or dependencies were changed.
