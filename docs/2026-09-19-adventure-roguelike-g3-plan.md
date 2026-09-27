# Gauntlet 3 — real roguelike (decided 2026-09-19, user: "you decide")

Starts AFTER gauntlet-1/2 work ships (ship.sh → SHIPPED). New branch off the shipped master in the same worktree.

## Engine decision
PixiJS 8 (installed, proven in components/wordTowerV2) + GSAP timelines + custom-pixi-particles + pixi-filters.
NOT Phaser: second ~1MB engine + second render loop; the letter board must stay the DOM GridComponent (input, RTL, tile skins).
Bridge: DOM board rects → canvas coords, so traced letters fly from board into the arena.

## Bar
Slay the Spire (MegaCrit, Steam 646570) — evidence pack /tmp/adv-rogue/bar-sts/. Bookworm stays the bar for word combat.

## Spine first (single Opus builder, TDD, sequential)
- Branching act map per world: rows of nodes {fight, elite, treasure, shop, rest, event, boss}, seeded from run seed,
  StS-like rules (no elite/rest in first rows, rest before boss, 2-4 choices per row, paths cross). Pure `lib/adventure/play/runMap.ts`.
- Run token carries map + position; /start validates the chosen node is reachable from the current one (replaces step===level).
- Non-play nodes resolved server-side: POST /api/adventure/node {runToken, choice} → treasure (relic), shop (buy with gold:
  relic/potion/heal/remove-curse), rest (heal vs upgrade a relic), event (text + 2-3 choices with seeded outcomes).
- Fight nodes map to the existing level kinds (hunt/chain/fog/bomb/classic) via the world's twist; elite/boss unchanged.
- Stars/unlock/collection writes unchanged (a world is cleared by beating its boss node).
- Gold finally has a sink (shop).

## Pieces (gauntlet, after spine)
1. Run map UI — StS-style scrolling act map, node icons (Higgsfield), path choice, current position, legend, readable at 390px.
2. Pixi battle arena — hero vs enemy on a stage above the board: idle bob, lunge, knockback, hit-stop, shake, projectiles both
   ways, inbound hit beat (red flash, −1♥ float, consequence banner), kill → loot drop flies to HUD.
3. Shop / rest / treasure / event screens.
4. Relic bar — named, top-of-screen like StS, tooltip, flash on trigger (open gap from gauntlet 2).
5. Full run integration (map → node → … → boss) + he RTL.

## Open gaps carried from gauntlet 2
kill payoff shows no loot object · no inbound player-hit beat · relic bar collapsed/unnamed.

## Ecosystem (user, 2026-09-19: "make sure the adventure talks to the rest of the game")
Survey running (Explore agent). Expected wiring, server-side in /complete + /node where possible (service client):
XP/level per cleared node · daily quests/missions + streak credit · weekly chest progress · global achievements ·
game history/profile stats rows · leaderboard (adventure depth/score) · home "Continue run" card with run state ·
shareable run-summary OG image (no emoji) · PostHog events per convention with $host · cosmetics already (world skins).
Teacher hook: classroom word lists → run targetWords (deal.ts already accepts targetWords).
Piece 6 in gauntlet 3: "Ecosystem" — judged on: does a finished adventure node visibly move XP/quests/streak/chest, and does the rest of the app surface the run.

### Ecosystem survey result (2026-09-19) — wire in this order
1. Analytics: trackGameStart/trackGameEnd (utils/growthTracking.ts:1222/1249), stable mode label 'adventure' (dedupe keyed on mode).
2. Profile stats + season leaderboard: copy app/api/stats/record-game/route.ts pattern into /api/adventure/complete (profiles.total_score/words/xp via leaderboardPointsForGame). NOT game_results (socket-only table).
3. XP: increment_player_xp (daily cap server-side) + checkLevelUp → existing level_up push. Service client (auth.uid guard, memory xp-rpcs-were-callable-for-any-player).
4. Global achievements: checkLifetimeAchievements (backend/modules/achievementManager.ts:689); merge with adventure_achievement_counts.
5. Share: app/api/og/boss-defeat/route.tsx exists with ZERO callers → share button on run complete / boss kill.
6. Coins: awardCoinsServer (backend/services/economy/awardCoins.ts:32) + new AwardCoinsReason literal; run gold stays run-only, boss/world clear pays coins.
7. Streak: POST /api/streak on a completed node.
8. Daily quests: dailyQuestPool.ts EXCLUDES beta modes by design → product call; skip while adventure is beta.
Home card: lib/landing/modeMeta.ts:94 adventure card is static → add "continue run" state (world/node/hp) from player_progression + run storage.
Teacher: lib/education/classroomGameHandoff.ts lessonGameData handoff → needs own adventure path+predicate so vocab never leaks into casual runs.
Gotchas: backend/modules reachable from app/api are webpack-bundled → extensionless imports; leaderboard weights duplicated in SQL.
