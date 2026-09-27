status: shipped
attempted: run coverage audit (code vs PostHog live events), triage DEAD/CRATERED/mode-completion holes, fix highest-leverage one via TDD
files_touched: fe-next/lib/connections/gameLogic.ts, fe-next/components/connections/ConnectionsGame.tsx, fe-next/lib/connections/__tests__/gameLogic.test.ts
next_steps: verify via impact ledger (connections game_completed count should rise vs game_started, currently 1 vs 9/14d). Backlog: never-wired session_start/first_word_found/hint_used P1 events; MP mode='random' mislabel (isMultiplayer games sometimes emit host-intent mode instead of resolved mode, 2 events/14d, low volume but worth a wider MP telemetry pass).
