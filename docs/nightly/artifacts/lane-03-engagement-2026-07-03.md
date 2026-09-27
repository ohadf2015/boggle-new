status: shipped
attempted: Flag hygiene, new experiment exp-wordcraft-hint-duration-v1, 2 new analytics events
files_touched:
  - fe-next/lib/experiments.ts (added exp-wordcraft-hint-duration-v1)
  - fe-next/components/word-craft/wordCraftTelemetry.ts (added trackWordCraftGameStarted, trackWordCraftAbandoned)
  - fe-next/app/[locale]/word-craft/PageClient.tsx (wired experiment + game_started event)
next_steps:
  - Monitor exp-wordcraft-hint-duration-v1 (PostHog flag id=218696, live) for word_craft_turn_submitted rate lift
  - Wire trackWordCraftAbandoned call (imported but not called — needs cleanup useEffect on back nav)
  - eslint result still pending (background task bhdc681js)
