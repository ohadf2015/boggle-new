status: partial
attempted: Flag hygiene audit, experiment wiring verification, PostHog ensure sweep, triage queue update for 87-day-old inconclusive flags
files_touched:
  - docs/nightly/triage-queue.md (added share-prompt-timing + show-signup-after-first-win retirement items)
next_steps: |
  EXPERIMENTS confirmed wired + PostHog flags exists:
    exp-wordhunt-hint-v1 -> WordHuntResultsContent.tsx
    exp-game-abandon-confirm-v1 -> LandscapeGameLayout + PortraitGameLayout + DesktopGameLayout
    exp-mp-round-feedback-top-v1 -> ResultsMainContent.tsx
    wordhunt-crosspromo-position -> WordHuntResultsContent.tsx
    wheel-replay-cta-v1 -> WordWheelReplayCta.tsx
    wheel-signup-offer-v1 -> WordWheelResults.tsx
    landing-variant-homepage-v1 -> LandingHero.tsx

  ANALYTICS GAPS (add tomorrow):
    practice_hub_viewed -> fe-next/app/[locale]/practice/PageClient.tsx useEffect on mount
    wheel_results_bounced -> WordWheelResults.tsx pagehide handler (guardrail for wheel-signup-offer)

  FLAG RETIREMENT (human): share-prompt-timing + show-signup-after-first-win (87d, no winner) in triage-queue.md
  BLOG DIRECTIVE -> lane 06 (SEO/content)
  FUNNEL: game_started=285 -> game_completed=184 (35% drop); practice=14->1 (real behavior, telemetry intact)
