status: shipped
files_touched:
  - fe-next/lib/analytics/lazyPosthog.ts (added isLoaded() to proxy)
  - fe-next/utils/authAnalytics.ts (updated isPostHogLoaded() to use isLoaded())
  - fe-next/utils/__tests__/authAnalytics.test.ts (updated mock to expose isLoaded via __loaded)
next_steps: Wire brain-drill game_started event (mode emits game_completed x16 but zero game_started — entry event missing); then adventure game_completed (8 started / 0 completed)
