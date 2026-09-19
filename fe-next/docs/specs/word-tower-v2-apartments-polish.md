# Word Tower v2 — apartments & polish pass (2026-09-19)

User asks (round 6): start on the ground (no half-screen platform), no flicker/lag
on the climb or at biome changes, v2-owned biomes + assets (nothing from v1's
backdrop), much bigger blocks that look like apartment floors, variable rewards
that change gameplay, fewer vowels on the wheel, smoother, new achievements +
celebration texts + UI, overall polish.

## Decisions

| Ask | Root cause / decision |
|---|---|
| Half-screen platform at start | `paintGround` hazard footing = 260 world px (~66% of a phone). Removed; the first floor lands on the street. |
| Flicker at biome change | DOM sky (3× v1 `WordTowerBackdrop`, props, sightings, 120vmax conic sunburst restyled on every biome flip) re-rendered on each height publish; camera fed raw jittering physics height. Sky moves INTO Pixi (`skyArt.ts`), camera reads a hysteresis-filtered height. |
| New biomes/assets | `lib/wordTowerV2/biomes.ts` (7 v2 biomes by floor, own palettes) + `skyArt.ts` procedural props (clouds, birds, balloons, jets, aurora, stars, satellites, planet). No v1 imports. |
| Bigger blocks | 3 m floors (`PX_PER_M` 40, block 120 px). Camera lets ≤35% of a slab leave the screen at the swing's far end so a 5-letter floor is ~65% of a phone's width. |
| Apartments | `paintBlock` → facade, cornice, floor slab, windows (lit per tenant), sign plaque with the word, lobby door on floor 1. |
| Rewards | `rewards.ts`: pity-timed crates paying gameplay effects — Steady crane (slower swing ×3 drops), Plumb line (straight drop ×2), Wide load, Rebar (freezes lower floors), +Scrambles, Jackpot. |
| Vowels | `generateWheel` gets optional `maxVowels` (default unlimited, v1 unchanged); v2 passes 3 of 7. |
| Achievements/celebrations | `achievements.ts` (persistent, once-ever badges) + `celebrations.ts` (varied callouts, one priority queue). New HUD + results screen. |
| Perf | Crane/ruler static parts key-guarded; no DOM sky; one DOM toast at a time. |
