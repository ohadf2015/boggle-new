# Adventure Mode Rebuild — Spec (2026-09-19)

Status: beta-only (`canSeeInWorkModes`), stays beta after ship.

## Why
Adventure = 34k-line custom engine (own `AdventureGrid`, ~20 orchestration hooks, 30 API routes,
skill tree / shop / endless / boss-rush / weekly / wheel+hunt archetypes). Known server-trust holes
(client-sent gold/score/flash flags), boss phase double-fire. User: "not working at all" — rebuild.

## Base = classic solo board
PostHog 30d: classic 403 users start / 176 finish; singleplayer 311/150; blast 236/85. Classic
board (`components/GridComponent.tsx`) is the best + most-played engine and owns tile skins.

## Keep
- World map UI: `WorldMap.tsx`, `WorldMapBackground.tsx`, `WorldMapDecorations.tsx`, `MasteryBadge`
  (+ `lib/adventure` world config/constants/unlock helpers, world art).
- Collections: `CollectionPanel.tsx` + `collectibleConfig`.
- Achievements: `achievements/*`, `useAdventureAchievements`, `/api/adventure/achievements`.
- Boss idea + juice: `bossConfig` (names/taunts/images), 10 bosses x 5 art states,
  `BossDefeatFireworks`, boss sounds, confetti, sound effects context.

## New (from scratch)
1. **Level table** `lib/adventure/levels.ts` (pure): world 1-10 x 7 levels, level 7 = boss.
   Per level: grid size, seconds, star thresholds (score), min word length.
2. **Signed attempt** `lib/adventure/attemptToken.ts` (server): `POST /api/adventure/start`
   generates board server-side, returns `{grid, token}`; token = HMAC(world, level, grid, issuedAt).
3. **Server scoring** `POST /api/adventure/complete` `{token, words[]}` → verify HMAC, dedupe words,
   check each word is on the grid (`findAllWords` set) and in dictionary, score with
   `calculateWordScore`, derive stars server-side. Client never sends score/stars/gold.
   Writes `level_completions` (best), `player_progression.total_stars/current_world/level`.
4. **Play screen** `components/adventure/play/AdventureLevel.tsx`: `GridComponent` + HUD
   (timer, score bar with 1-2-3 star notches, found words) + world backdrop + world tile skin.
5. **Boss level**: boss HP = 3-star threshold; each word = damage = its score; art state
   idle/hurt(flash)/enraged(<35%)/defeated; every N s boss "attacks" = freezes 2 tiles for 4s
   (`frozenTiles` prop) + taunt bubble. Timer out with HP>0 = lose.
6. **World skins**: 10 new tile skins `tile-skin-world-{1..10}` (Higgsfield tile-face art),
   registered in `lib/cosmetics.ts` with unlock `{type:'adventure', world}`, granted on beating a
   world boss. `GridComponent` gets `tileSkinOverride` so a level always renders its world's skin.
   Collection "Skin Vault" tab shows locked/unlocked world skins and equips them for all modes.
7. **Higgsfield art**: 10 cohesive portrait world backdrops (tile skins are CSS — textures under letters read as mud).

## Remove
Old engine + everything not in Keep: `AdventureGame/Grid/Shell`, hub, level grid, wheel/hunt
archetypes, skill tree, shop, endless, boss rush, weekly challenge, abilities/combat/v2 engine,
their hooks, pages and API routes (except progress, achievements, inventory, new start/complete).

## Decisions (after advisor review)
- Build additively, delete old tree last in one mechanical commit.
- Score = sum of base `calculateWordScore(word)`, NO combo — client shows exactly what server credits.
- Attempt = HMAC token keyed on service-role key (`lib/adventure/play/attemptToken.ts`); no migration
  (Supabase migrations CI is dead). Replay harmless: completions keep best only.
- Unlock rule single source `lib/adventure/play/progress.ts#canPlayLevel`: level L needs L-1 cleared,
  world N needs world N-1 boss beaten. WorldMap must use the same rule.
- Boss stars = server-measured elapsed time (fast kill = 3). HP = 2-star score.
- Collections feed: `/complete` grants lore-scroll (first clear), rune-fragment (first 3★),
  boss-trophy-wN (first boss win) into `player_inventory` via service-role client.
- Achievements feed: client play loop calls `earnAchievement(id)` (hook unchanged).
- World skins: CSS `[data-tile-skin='world-N']` in `app/cosmetics.css`; unlock = boss-trophy-wN row;
  equip writes localStorage + `profiles.equipped_cosmetics` (both sources, Class 1).
- Higgsfield: 10 world backdrops `public/images/adventure/play/world-N.webp` (world 6 pending retry).

## Root cause found
RLS (2026-04-02) admits only service_role for INSERT/UPDATE on player_progression/player_inventory,
but old `/complete` wrote with the user client → every progression + loot write silently failed.
Last level_completions row 2026-08-14; zero adventure players in 30d.

## Progress
- [x] Pure core `lib/adventure/play/*` + route tests (start 7, complete 10)
- [x] `/api/adventure/start`, `/complete` rewritten; dictionary loader → `lib/server/dictionarySet.ts`
- [x] scores/sync adventure handler removed (tests retargeted)
- [x] GridComponent `tileSkinOverride`; 10 world skins CSS; Skin Vault; equipWorldSkin (both sources)
- [x] AdventureLevel (classic board + backdrop + star meter / BossPanel + RunResult), useAdventureRun (7 tests)
- [x] AdventureView rewritten (map → world levels → play); WorldMap/LevelGrid use canPlayLevel; 10 Higgsfield backdrops
- [x] Old tree deleted via import-graph reachability (~560 files incl. AI-director/adaptive-difficulty stack); tsc RC=0
- [x] adventurePlay.* i18n (33 keys x 6 locales)
- [x] lint clean; real-DB e2e: locked 403, start/complete 200, tampered 400, boss win → trophy; caught + fixed
      `player_inventory.item_type` CHECK violation and boss lore-scroll (not in catalog)
- [x] browser (390px): map boss-gates, level grid, boss intro/fight/loss, Skin Vault equip → skin shows in classic; he RTL
- [ ] build · /ship (beta)

## Known follow-ups (not in this pass)
- ru has no server word set → ru players get an English board (`lib/adventure/play/server.ts`).
- Old adventure public assets (music/adventure, images/adventure/parallax|loot|backgrounds, 3d islands) partly unused now.
- ~1,200 legacy `adventure.*` translation keys remain; many now unused.
- Adventure music (old `useAdventureMusic`) dropped; play uses SFX only.
