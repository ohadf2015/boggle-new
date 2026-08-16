status: shipped
attempted: run coverage audit (posthog-coverage.sh), triage DEAD/CRATERED/mode-completion holes, fix one high-value gap
files_touched: fe-next/components/referral/ReferralCodeClaimer.tsx, fe-next/components/referral/__tests__/ReferralCodeClaimer.test.tsx
next_steps: per-mode game_started/game_completed completion query not reached (time-boxed after the fix). Next run: (1) run the §2 per-mode query, (2) never-wired backlog still has room_joined_via_code, replay_countdown_shown, results_autoplay_cancelled, page_view — page_view likely superseded by PostHog autocapture $pageview, worth confirming then removing from the registry instead of chasing it as a bug.
