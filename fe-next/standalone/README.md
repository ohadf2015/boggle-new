# LexiClash — Standalone Portal Build

Self-contained HTML5 solo word-hunt for game portals (**Poki / CrazyGames / GameDistribution**)
and direct hosting (itch.io / our own site). **Zero external requests**, single relative-path
bundle — the constraint all three portals share that the main Next/Supabase/Socket.IO app can't meet.

## Why this exists
All three portals reject the main app because it needs a backend (Supabase, Socket.IO, auth).
This is a from-scratch shell over the app's **pure** logic:
- **Reused** (copied/ported, kept in sync manually): scoring (`shared/utils/scoring.ts`),
  authoritative 8-adjacency validation (`utils/clientWordValidator.ts` → `core/validate.ts`),
  dictionary (`public/dicts/en.dict.gz`, copied at build time — not duplicated in git).
- **Written thin**: classic-Boggle-dice board gen, drag-trace board (Pointer Events + SVG connector),
  60s game loop, results, portal SDK adapter.

## Commands
```bash
npm install
npm run dev          # local dev (also copies the dict)
npm test             # 29 unit tests (validate / board / scoring / dict / pathTrace / evaluate / portal)
npm run build        # tsc + vite build → dist/  (base:'./' relative paths)
npm run serve        # static-serve dist/ on :8199 (portals serve over http; file:// blocks fetch)
npm run validate     # check relative paths + CrazyGames file-count cap + size report

# Portal-ready zips (each embeds ONLY that portal's SDK via build-time DCE):
npm run package               # none / direct host  → lexiclash-standalone.zip
npm run package:poki          # → lexiclash-poki.zip
npm run package:crazygames    # → lexiclash-crazygames.zip
VITE_GD_GAME_ID=<hash> npm run package:gd   # → lexiclash-gamedistribution.zip
```
Current size: ~1.24MB zip (dict 1.13MB + 50KB gz JS + CSS). Poki initial-download cap is 8MB.

## Portal SDK adapter (`src/portal/portal.ts`)
One `Portal` interface; the concrete impl is chosen at **build time** by `VITE_PORTAL`
(`poki` | `crazygames` | `gamedistribution` | `none`, default `none`). Per-portal builds are
required because each portal needs its own external SDK script and forbids the others'.
Lifecycle wired: `ready()` on load, `gameplayStart()` on first trace, `gameplayStop()` at results,
`commercialBreak()` between rounds, `rewardedBreak()` available for future boosts.

## Submission status (2026-07-18)
- **Poki**: dev early-access applied; submit this build once granted.
- **CrazyGames**: prior full-app submission rejected on engagement — this build is the relaunch artifact.
- **GameDistribution**: account live, `GD_GAME_ID=ce3e476106d643b59b962c5a787d067d`; upload zip to leave Draft.
See `../docs/2026-07-18-game-portals-web-ads-application-status.md`.

## TODO / polish
- Bundle Fredoka/Rubik woff2 (currently system-ui).
- Optional "beat-the-solver" mode (needs a trie built once at load — avoid depth-15 hang).
- Run each zip through Poki Inspector / CrazyGames QA tool at submission.
