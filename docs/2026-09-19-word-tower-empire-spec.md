# Word Tower v2 — Empire, Rivals & Polish (spec, 2026-09-19)

Worktree `/Users/ohadfisher/git/boggle-tower`, branch `feat/word-tower-empire`. Route `/[locale]/word-tower-v2` (beta gate; dev always allowed).
Bars: **Coin Master** (Moon Active) for meta — village build, attack/raid, revenge, shield, chests. **Tower Bloxx Deluxe** (Digital Chocolate) for stacking feel. Evidence pack `/tmp/wt2/bar/` (INDEX.md, NOTES.md).

## User asks (all must land)
1. Polish + declutter; full width (desktop/TV); crane maybe redundant.
2. Change a word after selecting it (before the drop).
3. Bug: after the camera pans up, a floor looks missing and the tower floats.
4. Variable rewards; upgrades that make the building steadier over time; reasons to come back.
5. Real-estate empire built over time; feels like an upgrade game.
6. End of run: compare vs other players — avatars, see their actual buildings, wreck part of one; revenge; competitive.
7. Generate art assets where it makes it look/feel good and satisfying.

## Known root causes (do not rediscover)
- **Width**: not CSS. `lib/wordTowerV2/camera.ts` `frameCamera`: `scale = min(byWidth, byHeight, byComfort, MAX_SCALE)`; `byComfort` (`COMFORT_PLAY_HEIGHT_PX=480`) binds on desktop, so extra width only adds sky. Fix in camera scale + side content, keep phone framing.
- **Floating tower**: `paintGround` (towerArt.ts) is a child of `scene` at local y=0 (TowerCanvas.tsx `scene.y = groundScreenY + cameraY`), so it slides under the opaque dock when `cameraY>0` and the lowest visible floor sits on nothing. Fix = the tower visibly continues below the dock edge (floors drawn down to/under the dock, no gap, no sky strip under the lowest visible floor) — a pinned base treatment, not culling.
- **Change word**: `WordTowerV2.tsx` `submit()` calls `hoist()` + `deal()` in one tick; `engine.ts` has no despawn. Needs an engine `despawnBlock` (removes the Matter body — no leaked bodies, tested) + restoring the pre-deal wheel/selection. Allowed only while the block hangs on the crane (phase `swinging`), not after drop.
- **Crane**: it is the AIM mechanic (`crane.ts` `throwArc`/`predictLandingX`). The crane VISUAL may be slimmed/restyled/replaced (e.g. a minimal hook + cable from the top edge); the swing/arc/landing contract stays. `lib/wordTowerV2/__tests__/feel.test.ts` is gate: red = gate red, never edit its thresholds.

## Economy & data contract (foundation, built first)
Currency **coins**. Pure logic in `lib/wordTowerV2/estate.ts` (TDD):
- `runCoins(summary)` — from floors, perfects, best combo, crates; clamped max.
- `rollChest(seed, tier)` — variable reward: coins range + chance of shield / golden brick (rare) / blueprint (epic); tiers common/rare/epic by run quality.
- **District** = 5 plots (like Coin Master's 5 village items). Each plot is a building type with level 0..5; `upgradeCost(district, plot, level)` rising curve. All 5 plots at level 5 → district complete → next district (new skyline theme, bigger costs, bigger yields). Districts named via i18n.
- **Perks** derived from plots (make runs steadier over time): Foundation → wider/heavier base, less sway; Crane Yard → slower swing / wider perfect window (bounded so `feel.test` invariants hold at level 0); Vault → coin bonus %; Insurance → shields cap; Landmark → score multiplier. `perksFromEstate(estate)` pure.
- **Raid**: `raidOutcome({attackerAccuracy, defenderShields, plotLevel})` → blocked | damaged(plot, coinsStolen). Damaged plot must be repaired (cost) before upgrading; damage never drops below level 0 and never touches another district.
- Guests: estate in localStorage (same shape); raids/rivals need auth (show sign-in CTA).

Server (new tables — do NOT reuse `word_tower_progress`/`word_tower_pending_wrecks`: v1 is public and claims those rows):
- `word_tower_estates(player_id pk → auth.users, coins bigint, district int, plots jsonb, shields int, last_tower jsonb, best_m numeric, runs int, updated_at)`; `last_tower` = compact block list (word, w, x, y, angle, color) of the player's best/last tower so rivals can render the ACTUAL building.
- `word_tower_raids(id, attacker_id, defender_id, district, plot, blocked bool, coins_stolen int, created_at, seen_at, avenged_at)`.
- RLS: select own rows only; ALL writes via service client in routes (insert/update/delete with check false for clients). Migration file in `supabase/migrations/` AND applied to prod via Supabase MCP (CI migrations are dead); verify with information_schema.
- Routes under `app/api/word-tower/estate/`: `GET /` (own estate + unseen raids), `POST /run` (run summary → coins credited server-side via `runCoins`, clamp + rate limit; stores last_tower), `POST /upgrade {plot}`, `POST /repair {plot}`, `GET /rivals` (3 rivals near your district/best_m with display_name, userId, avatar fields, district, plots, last_tower; plus revenge list = raids on you not avenged), `POST /raid {defenderId, accuracy, revenge?}` (server recomputes outcome, applies shield/damage/steal atomically, push notify via existing `notifyWordTowerWreck`).
- Client hook `components/wordTowerV2/useEstate.ts`.
- Rival avatars: always pass `userId` to `Avatar` (no userId = skeleton forever); names from `display_name`.

## Pieces (parallel gauntlet after foundation)
core (layout/width, floating fix, change-word, declutter, crane visual) · rewards (in-run + end chest variable rewards) · empire (estate screen, upgrades, perks visible in-run, district completion) · rivals (end-of-run compare, see + wreck real buildings, revenge, shield) · then full-run integration.

## Gate
`cd fe-next && NODE_OPTIONS=--max-old-space-size=8192 npx --no-install tsc --noEmit` (rc 134 = OOM, not pass) · scoped eslint · `npx --no-install vitest run lib/wordTowerV2 components/wordTowerV2 lib/wordTower app/api/word-tower` · `npm run build` at ship. i18n: all 6 locales (en he sv ja es ru), then `npx --no-install tsx scripts/build-i18n-assets.ts --skip-brotli`. Files < 500 lines. TDD for logic. Review hooks: `?demo=1`, `?demo=1&smash=1`, `?demo=1&words=a,b`.

## Foundation API (as built)

Files: `lib/wordTowerV2/estate.ts` (economy, pure) · `estateCatalog.ts` (10 districts x 5 buildings) · `estateTower.ts` (last_tower codec) · `estateServer.ts` (SERVER ONLY: row mapping, CAS mutate, profiles) · routes `app/api/word-tower/estate/{route,run,upgrade,repair,rivals,raid,seen}` · hook `components/wordTowerV2/useEstate.ts` · sim `scripts/wordTowerEstateSim.ts` (output `/tmp/wt2/sim.md`) · migration `supabase/migrations/20260919200000_word_tower_estates.sql` (APPLIED to prod 2026-09-19).

### Hook — `useEstate(): UseEstate` (no args; reads `useAuth()` itself)
```ts
status: 'loading' | 'ready' | 'error'   // 'loading' until auth settles: estate = emptyEstate(), perks = NEUTRAL_PERKS, nothing read
authed: boolean                          // false for guests -> show sign-in CTA for rivals/raids
estate: Estate                           // stable identity (safe in effect deps)
perks: Perks                             // perksFromEstate(estate); NEUTRAL at level 0
inbox: EstateRaid[]                      // raids on me not yet seen (authed only)
reportRun(s: RunSummary): Promise<{ coins: number; chest: ChestRoll } | null>
upgrade(slot: PlotSlot): Promise<{ ok: true; districtCompleted: boolean } | { ok: false; reason: string }>   // optimistic, server wins
repair(slot: PlotSlot):  Promise<same>                                            // golden brick first, else coins
rivals(): Promise<{ rivals: RivalView[]; revenge: RevengeEntry[] } | null>     // null = guest
raid(defenderId: string, accuracy: number /*0..1*/, revenge?: boolean): Promise<RaidResult | { error: string } | null>
markSeen(ids?: string[]): Promise<void>                                         // no ids = all
refresh(): Promise<void>
```
Guest storage key `wordTowerV2.estate` (`ESTATE_STORAGE_KEY`); guests bank runs/upgrades locally with the same pure functions. A guest estate is NOT migrated on sign-in (open item).

### Types (from `@/lib/wordTowerV2/estate`)
- `RunSummary { floors, perfects, bestCombo, crates, heightM, tower?: TowerBlock[] }` — map from `RunState` (`floors`, `bestCombo`, `crates`; count perfects yourself) + measured height. Send `tower` (lowest floor first) so rivals see the real building.
- `TowerBlock { word, w, x, y, angle, color }` — engine px, ground y=0 up negative, color 0xRRGGBB. Max 60 blocks stored; words sanitised.
- `Estate { coins, district (1..10), plots: Plot[5], shields, bricks, blueprints, raidCharges (0..3, +1 per run), bestM, runs, lastTower }`; `Plot { slot, level 0..5, damaged }`.
- `PlotSlot = 'foundation'|'craneYard'|'vault'|'insurance'|'landmark'` (`PLOT_SLOTS` order). Art/name: `buildingFor(district, slot) -> { id, i18nKey }`, `districtDef(d) -> { id, i18nKey, buildings }`. i18n keys `wordTowerV2.estate.district.<id>` / `wordTowerV2.estate.building.<id>` are NOT translated yet (UI builders add them, all 6 locales).
- `ChestRoll { tier: 'common'|'rare'|'epic', coins, shields, bricks, blueprints }` — never empty; rare ~15% (+1 golden brick), epic ~3% (+1 blueprint +1 shield).
- `Perks` — plain multipliers the RUN applies (never mutate `SWING`/`PERFECT_RATIO`): `baseWidthMult` (ground-floor block width, <=1.25), `swayMult` (<1 steadier, >=0.7), `swingPeriodMult` (crane period, <=1.2), `perfectWindowMult` (x PERFECT_RATIO, <=1.2 — tested to keep the perfect window <=140ms), `coinMult` (already applied server-side to run coins; display only), `shieldCap` (2..5), `scoreMult` (<=1.5). All exactly 1 on a fresh estate.
- `RivalView { userId, displayName, avatar: { avatarConfig, avatarEmoji, avatarColor, avatarImage }, district, plots, shields, bestM, lastTower }` — render `<Avatar userId={r.userId} customAvatar={r.avatar.avatarConfig} />`.
- `RevengeEntry { raidId, coinsStolen, blocked, plot, createdAt, rival: RivalView }`; `EstateRaid { id, attackerId, attackerName, attackerAvatar, blocked, plot, coinsStolen, revenge, avenged, createdAt }`.
- `RaidResult { raidId, outcome: { kind: 'blocked', attackerCoins } | { kind: 'damaged', slot | null, coinsStolen, attackerCoins }, revenge }`. Raid errors: `no_charges` (409, need a run), `no_revenge` (400), `no_defender` (404).

Useful pure helpers for UI: `upgradeCost(district, slot, level)`, `repairCost(district, slot, level)`, `canUpgrade(estate, slot)`, `districtComplete`, `runCoins`, `chestOdds(quality)`, `runQuality(summary)`.

### Routes (all bearer/cookie auth via getAuthedUser; service-role writes; client can only SELECT own rows)
`GET /estate` -> `{ estate, perks, raids }` (creates empty row) · `POST /estate/run` body RunSummary -> `{ estate, perks, coins, chest }` (4/min) · `POST /estate/upgrade {plot}` -> `{ estate, perks, cost, usedBlueprint, districtCompleted }` · `POST /estate/repair {plot}` -> `{ estate, perks, cost, usedBrick }` · `GET /estate/rivals` -> `{ rivals, revenge }` · `POST /estate/raid {defenderId, accuracy, revenge?}` -> `{ raidId, outcome, revenge, estate, perks }` (atomic RPC `word_tower_apply_raid`; push via `notifyWordTowerWreck` only when damaged) · `POST /estate/seen {ids?}` (added: the hook's markSeen needs it).
