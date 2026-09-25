'use client';

/**
 * Adventure level screen — the classic board (GridComponent) wearing the
 * world's tile skin, over the world backdrop, with a star meter or boss fight.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GridComponent from '@/components/GridComponent';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { worldSkinId } from '@/lib/adventure/play/worldSkins';
import type { AdventureAchievementId } from '@/utils/adventureAchievementUtils';
import { useAdventureRun } from './useAdventureRun';
import { useWordChecker } from './useWordChecker';
import LevelStage from './stage/LevelStage';
import BoardHazards from './stage/BoardHazards';
import LevelIntro from './intro/LevelIntro';
import BoardFx from './fx/BoardFx';
import FoeTarget from './fx/FoeTarget';
import RivalAttack from './stage/RivalAttack';
import FoundWords from './fx/FoundWords';
import HintButton from './fx/HintButton';
import { hintCells, resolveHitPath, type Cell } from './fx/hintPath';
import type { HitEvent } from './events';
import RunResult from './RunResult';
import RunHud from './RunHud';
import RunShellStyles from './run/RunShellStyles';
import { RUN_SHELL_CLASS } from './run/landscape';
import { foeScore } from './foeScore';
import RunStatusOverlay from './RunStatusOverlay';
import LevelTopBar from './LevelTopBar';
import { resultHeld, FINALE_HOLD_MAX_MS } from './finaleHold';
import DeedStamp, { type DeedEvent } from './deed/DeedStamp';
import { deedTier, DEED_DROPS_PER_LEVEL } from './deed/deedTier';
import { castTiming } from './fx/castPath';
import { hitTier } from './fx/hitTier';
import DraftOverlay from './DraftOverlay';
import RunMapScreen from '../map/RunMapScreen';
import { readCleared, recordCleared, clearClearedNodes, isFreshRun } from '../map/clearedNodes';
import NodeScreen from './nodes/NodeScreen';
import { useNodeDemo } from './nodes/useNodeDemo';
import { useLevelVariant } from './variants/useLevelVariant';
import VariantPanel from './variants/VariantPanel';
import BoardLayer from './variants/BoardLayer';
import { runFloor } from './runFloor';
import { isCombatKind } from '@/lib/adventure/play/levels';
import { cn } from '@/lib/utils';

export const worldBackdrop = (world: number) => `/images/adventure/play/world-${world}.webp`;

// Module-level constant for empty hint array — never changes identity.
const NO_HINT_CELLS: Cell[] = [];

interface Props {
  world: number;
  level: number;
  hasNext: boolean;
  onExit: () => void;
  onNext: () => void;
  /** Run over: start a fresh run at the world's level 1. */
  onRestartRun?: () => void;
  /** Fired after a saved run so the map can refetch progress + inventory. */
  onSaved: () => void;
  onEquipSkin: (world: number) => void;
  earnAchievement: (id: AdventureAchievementId) => void;
  totalBossesBeaten: number;
  /** Levels already at 3 stars, not counting this one. */
  otherPerfectLevels: number;
  /** Roguelike entry: open on the act map and let the player choose the node. */
  mapFirst?: boolean;
}

export default function AdventureLevel({ world, level, hasNext, onExit, onNext, onRestartRun, onSaved, onEquipSkin, earnAchievement, totalBossesBeaten, otherPerfectLevels, mapFirst }: Props) {
  const { t, language } = useLanguageSafe();
  const sfx = useSoundEffects();
  const isWord = useWordChecker(language);
  const run = useAdventureRun({ world, level, language, isWord, mapFirst });
  // Which nodes of this run were actually played out — the map needs it to tell
  // "mid-fight" from "cleared" (see clearedNodes).
  const [cleared, setCleared] = useState<string[]>(() => (mapFirst ? readCleared(world) : []));
  // The map is the surface a run sits on: it stays mounted through the 'loading'
  // between two nodes, so a choice never flashes the empty level screen.
  const [mapShown, setMapShown] = useState(false);
  // Run over / run complete: the map comes back as a recap of the path walked.
  const [recap, setRecap] = useState(false);
  // A node screen (shop / campfire / chest / event) the player has left: it stays
  // dismissed until the run moves on, revealing the act map underneath.
  const [leftNode, setLeftNode] = useState<string | null>(null);
  useNodeDemo({ phase: run.phase, map: run.map, currentNode: run.currentNode, openMap: run.openMap, chooseNode: run.chooseNode });
  const [feedback, setFeedback] = useState<WordFeedback | null>(null);
  const [popups] = useState<Array<{ id: number; pts: number }>>([]); // "+N" chip replaced by the WordCast damage number
  const streakRef = useRef(0);
  const invalidRef = useRef(0);
  const hitSeq = useRef(0); // monotonic hit id: two submits in one ms must not collide
  const worldCfg = getWorldConfig(world);
  const lvl = run.lvl;
  // The board played is the MAP NODE's level, not the `level` prop the route came in with
  // (/start derives it from the node and ignores `level`) — the header must not lie about it.
  const shownLevel = lvl?.level ?? level;
  // …and inside a run the number the PLAYER is told is the act floor, counted
  // exactly as the map counts it. `shownLevel` is the LevelSpec slot the node
  // borrows its board from, so it drifts from the floor (the map said FLOOR 3
  // while the card said LEVEL 4) and can repeat across neighbouring fights.
  const floor = useMemo(() => runFloor(run.map, run.run), [run.map, run.run]);
  const whereLabel = floor
    ? t('adventurePlay.map.floorOf', { step: floor.step, total: floor.total })
    : t('adventurePlay.worldLevel', { world, level: shownLevel });
  const isElite = lvl?.kind === 'elite';
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [lastHit, setLastHit] = useState<HitEvent | null>(null);
  // Top of the praise ladder: a blow sized against the foe's REMAINING HP stamps a deed.
  const [deed, setDeed] = useState<DeedEvent | null>(null);
  const deedDrops = useRef(0);
  // Kill banner / defeat beat first, THEN the result screen (it used to pop LEVEL UP under the kill).
  const [finaleDone, setFinaleDone] = useState(false);
  const onFinaleDone = useCallback(() => setFinaleDone(true), []);
  // Word-hit juice: the traced tiles of the last submit, the stage (fly target) and the screen (shake).
  const tracedRef = useRef<Cell[] | null>(null);
  const [hitPath, setHitPath] = useState<Cell[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  // Level variety (fog / bomb client rules; hunt + chain presentation).
  const variant = useLevelVariant({
    lvl, playing: run.phase === 'playing', grid: run.grid, onShiftClock: run.shiftClock,
    onBoom: sfx.playBlastBombSound, onDefuse: sfx.playPowerUpSound,
  });
  const [chainBrokenAt, setChainBrokenAt] = useState<number | null>(null);
  // `useAdventureRun` and `useLevelVariant` both return a fresh object every
  // render, and the run clock re-renders this screen 5×/s (a bomb level adds its
  // own fuse tick on top). Any callback that lists them as deps is therefore
  // rebuilt on every tick — which changed GridComponent's `onWordSubmit` prop
  // and blew past its memo, re-rendering all 25 tiles right through a drag.
  // Read them through refs so the handlers stay identity-stable for a whole level.
  const runRef = useRef(run);
  const variantRef = useRef(variant);
  useEffect(() => { runRef.current = run; variantRef.current = variant; });
  const variantOnPath = variant.onPath;
  const onPathSubmit = useCallback((cells: Cell[]) => { tracedRef.current = cells.map(({ row, col }) => ({ row, col })); variantOnPath(cells); }, [variantOnPath]);

  const onWordSubmit = useCallback(async (word: string) => {
    const run = runRef.current;
    const variant = variantRef.current;
    const traced = tracedRef.current;
    tracedRef.current = null;
    const r = await run.submitWord(word);
    if (r === 'idle') return;
    setHitPath(resolveHitPath(word, traced, run.grid, language));
    // Monotonic, not Date.now(): GridComponent dedupes the submit burst by id
    // and keys it by timestamp, so two submits in the same millisecond dropped
    // the second one's feedback entirely.
    const seq = hitSeq.current + 1;
    const id = `adv-${seq}`;
    if (r === 'ok') {
      // Same relic/chain/combo formula the server settles with (points of the word just added).
      const pts = run.lastWordPoints();
      sfx.playWordAcceptedSound?.();
      setFeedback({ id, type: 'accepted', word, score: pts, timestamp: seq });
      let praiseKey: string | undefined;
      if (lvl) {
        // `run` is this render's (pre-hit) state: the fight's HP, or the score foe's bar.
        const huntDone = run.targetsFound.length >= (lvl.huntCount ?? run.targets?.length ?? 0);
        // Fight nodes carry a rival too, but their stage is still the score foe.
        const staged = isCombatKind(lvl.kind) ? run.combat : null;
        const hpBefore = staged ? staged.enemyHp : Math.max(0, lvl.stars[2] - foeScore({ score: run.score, top: lvl.stars[2], kind: lvl.kind, huntMet: huntDone }));
        const maxHp = staged ? staged.enemyMaxHp : lvl.stars[2];
        const tier = deedTier({ word, pts, hpBefore, maxHp, foe: lvl.isBoss ? 'boss' : lvl.kind === 'elite' ? 'elite' : 'foe' });
        if (tier) {
          const drop = deedDrops.current < DEED_DROPS_PER_LEVEL;
          if (drop) { deedDrops.current += 1; run.grantHint(); }
          // A CRIT already gets the fx layer's screen-wide slab: one stamp, not two (the drop still lands).
          if (hitTier(word, pts) !== 'crit') {
            praiseKey = `adventurePlay.deed.${tier}`;
            setDeed({ id: hitSeq.current + 1, deed: tier, word, pts, drop, delayMs: castTiming(Array.from(word).length, false).impactMs });
          }
        }
      }
      setLastHit({ id: ++hitSeq.current, word, pts, result: 'ok', praiseKey });
      variant.accept();
      streakRef.current += 1;
      earnAchievement('FIRST_WORD');
      if (word.length >= 6) earnAchievement('LONG_WORD_6');
      if (word.length >= 8) earnAchievement('LONG_WORD_8');
      if (streakRef.current === 5) earnAchievement('WORD_STREAK_5');
      if (streakRef.current === 10) earnAchievement('WORD_STREAK_10');
    } else {
      sfx.playWordRejectedSound?.();
      streakRef.current = 0;
      if (r === 'invalid') invalidRef.current += 1;
      setFeedback({ id, type: r === 'dup' ? 'duplicate' : 'rejected', word, timestamp: seq });
      setLastHit({ id: ++hitSeq.current, word, pts: 0, result: r });
      if (r === 'chain') setChainBrokenAt(Date.now());
      variant.discard();
    }
  }, [sfx, lvl, language, earnAchievement]);

  const onHint = useCallback(() => {
    const w = runRef.current.takeHint();
    if (w) { setHintWord(w); sfx.playHintRevealSound?.(); }
  }, [sfx]);
  // The hint glows on the board until that word is found.
  const hintTiles = useMemo(
    () => (hintWord && run.phase === 'playing' && !run.words.includes(hintWord.toLowerCase()) ? hintCells(hintWord, run.grid, language, run.revealFullHint) : NO_HINT_CELLS),
    [hintWord, run.phase, run.words, run.grid, language, run.revealFullHint],
  );

  const variantFilter = variant.cellFilter;
  const frozenFilter = useMemo(() => (r: number, c: number) => !run.frozen.has(`${r}-${c}`) && variantFilter(r, c), [run.frozen, variantFilter]);

  // Memoize GridComponent element so BoardFx.memo gets stable children
  const gridElement = useMemo(
    () => (
      <GridComponent
        grid={run.grid}
        interactive={run.phase === 'playing'}
        onWordSubmit={onWordSubmit}
        onPathSubmit={onPathSubmit}
        language={language}
        tileSkinOverride={worldSkinId(world)}
        frozenTiles={run.frozen}
        cellFilter={frozenFilter}
        submitFeedback={feedback}
        comboLevel={run.combo}
      />
    ),
    [run.grid, run.phase, onWordSubmit, onPathSubmit, language, world, run.frozen, frozenFilter, feedback, run.combo],
  );
  // Hunt + chain goals live in the VariantPanel (tray / big letter) below the HUD.
  // Hunt: the foe cannot read K.O. before the hidden words are found (that is the real win).
  const huntMet = run.targetsFound.length >= (lvl?.huntCount ?? run.targets?.length ?? 0);
  const shownScore = lvl ? foeScore({ score: run.score, top: lvl.stars[2], kind: lvl.kind, huntMet }) : run.score;
  const goal = lvl?.kind === 'hunt' && !run.targets?.length
    ? t('adventurePlay.huntGoal', { count: lvl.huntCount ?? 0, found: run.targetsFound.length })
    : null;

  // Save → achievements + tell the map.
  const reported = useRef<unknown>(null);
  useEffect(() => {
    const res = run.result;
    if (!res || reported.current === res) return;
    reported.current = res;
    // The node underfoot has now been played out, win or lose: the map must stop
    // offering to resume it.
    if (run.currentNode) {
      recordCleared(world, run.currentNode);
      setCleared(readCleared(world));
    }
    onSaved();
    if (res.stars === 3) earnAchievement('PERFECT_LEVEL');
    if (otherPerfectLevels + (res.bestStars === 3 ? 1 : 0) >= 10) earnAchievement('LEVEL_MASTER');
    if (res.totalStars >= 50) earnAchievement('STAR_COLLECTOR_50');
    if (res.totalStars >= 100) earnAchievement('STAR_COLLECTOR_100');
    if (lvl?.isBoss && res.won) {
      earnAchievement('BOSS_SLAYER');
      earnAchievement('WORLD_COMPLETE');
      if (res.stars === 3) earnAchievement('BOSS_SPEEDRUN');
      if (invalidRef.current === 0) earnAchievement('BOSS_NO_DAMAGE');
      if (totalBossesBeaten + (res.rewards.some((r) => r.startsWith('boss-trophy-')) ? 1 : 0) >= 10) earnAchievement('ALL_BOSSES');
    }
  }, [run.result, run.currentNode, world, lvl, onSaved, earnAchievement, totalBossesBeaten, otherPerfectLevels]);

  const onMapSurface = run.phase === 'map' || run.phase === 'node';
  // While the act map (or a node screen) owns the screen, the level underneath is
  // UNMOUNTED, not just covered: a live board, its portalled hit sticker and the
  // stage's canvas kept running under an opaque map for no one to see.
  const mapOwnsScreen = !!mapFirst && (onMapSurface || (run.phase === 'loading' && mapShown));
  useEffect(() => {
    if (onMapSurface) setMapShown(true);
    else if (run.phase !== 'loading') setMapShown(false);
  }, [onMapSurface, run.phase]);

  // A fresh run (nothing walked yet) forgets the previous run's cleared nodes —
  // node ids repeat from run to run.
  // `run.run` is null until the server answers, and "no run yet" must NOT read as
  // "fresh run" — that wiped the history of a run in progress on every mount and
  // made a node you had already cleared say "resume this fight".
  const freshRun = isFreshRun(run.run);
  useEffect(() => {
    if (!mapFirst || !freshRun) return;
    clearClearedNodes(world);
    setCleared([]);
    // Every piece of state keyed by a NODE ID dies with the run, for the same
    // reason: a shop left at `r3l1` in the dead run would keep the new run's
    // `r3l1` dismissed, so its shop / campfire / event screen never opened and
    // the node was silently skipped.
    setLeftNode(null);
  }, [mapFirst, freshRun, world]);

  /** Run over → a brand-new run. Inside a map run that is an in-place re-mint
   *  (no remount, and the walked-node history is wiped with the token). */
  const restartRun = mapFirst ? run.newRun : (onRestartRun ?? run.retry);
  /**
   * In a map run the level underneath is UNMOUNTED whenever it is not the thing
   * being looked at — not merely covered. A board left mounted under the map, the
   * draft or the loader kept its portalled hit sticker and its stage alive, and
   * flashed the PREVIOUS node's board through every transition.
   */
  const showLevelBody = !mapFirst || (!recap
    && (run.phase === 'ready' || run.phase === 'playing' || run.phase === 'saving' || run.phase === 'done'));
  /** A node screen owns the foreground: the map below it goes inert. */
  const nodeScreenUp = !!run.nodeState && !!run.run && run.run.node !== leftNode
    && (run.phase === 'node' || run.phase === 'loading');
  /**
   * Same rule for the level: once the node is settled the result screen owns
   * the foreground, so the board, its hint button and the exit behind it leave
   * the tab order and the a11y tree instead of being merely painted over.
   */
  const levelSettled = run.phase === 'saving' || run.phase === 'done';

  const begin = () => {
    streakRef.current = 0;
    invalidRef.current = 0;
    deedDrops.current = 0;
    setFinaleDone(false);
    setDeed(null);
    setHintWord(null);
    if (lvl?.isBoss || isElite) sfx.playBossEntranceSound?.(); else sfx.playRoundStartSound?.();
    run.begin();
  };

  const onMapExit = useCallback(() => {
    trackGrowthEvent('adventure_exit', { from: 'level', world });
    onExit();
  }, [world, onExit]);

  // Only elite/boss stages play a finale; a fight node's rival must not hold the result.
  const stageCombat = lvl && isCombatKind(lvl.kind) ? run.combat : null;
  const holdResult = resultHeld(stageCombat, finaleDone);
  useEffect(() => {
    if (!holdResult || run.phase !== 'done') return;
    const id = setTimeout(() => setFinaleDone(true), FINALE_HOLD_MAX_MS);
    return () => clearTimeout(id);
  }, [holdResult, run.phase]);

  const secs = Math.ceil(run.msLeft / 1000);
  const urgent = run.phase === 'playing' && secs <= 10;

  return (
    /* select-none: a run is dragged, not read — tracing a word, panning the act map
       or tapping a node otherwise paints the labels under the finger in selection blue,
       and the highlight survives the next screen. */
    <div ref={screenRef} className="fixed inset-0 z-50 select-none overflow-hidden bg-[#0f1b3d] text-neo-cream">
      {/* The board is what's being read for the whole level, so the world art
          sits well back: dimmed, then a flat scrim, then a radial that is
          darkest behind the grid. At full strength the photo competed with the
          tiles and the foe panel for the same attention. The radial carries the
          lighting slot so a landscape canvas can re-pool it across the width. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative backdrop */}
      <img src={worldBackdrop(world)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-[#0a1028]/35" />
      <div data-adv-slot="lighting" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,16,40,0.7)_0%,rgba(10,16,40,0.2)_70%)]" />

      {showLevelBody && (
      /* The phone layout is a column; on a TV `RUN_SHELL_CLASS` turns this same
         tree into a three-lane grid (stage | board | word feed) under one
         full-width run strip — see run/landscape.ts. Pure CSS, so it is right at
         first paint and the children keep their DOM order. */
      <div inert={levelSettled || undefined} className={cn(RUN_SHELL_CLASS, 'relative z-10 mx-auto flex h-full max-w-lg flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]')}>
        <RunShellStyles />
        {/* Top bar */}
        <LevelTopBar
          worldName={worldCfg ? t(`adventure.worlds.${worldCfg.name}`) : ''}
          levelLabel={lvl?.isBoss ? t('adventurePlay.bossLevel') : isElite ? t('adventurePlay.eliteLevel') : whereLabel}
          secs={secs}
          urgent={urgent}
          onExit={onExit}
          world={world}
        />

        {/* Run bar — pinned under the title, above the stage: relics never leave the screen. */}
        {lvl && (
          <RunHud hp={run.hp} maxHp={run.maxHp} combat={run.combat} dispatchCombat={run.dispatchCombat}
            potionsLeft={run.potionsLeft} onPotion={run.drinkPotion}
            goal={goal} playing={run.phase === 'playing'}
            relics={run.runShown?.relics ?? []} lastHit={lastHit} words={run.words}
            world={world} level={shownLevel} kind={lvl.kind} seconds={lvl.seconds} combatControls={!isCombatKind(lvl.kind)}
            step={run.run?.step}
            /* The stage the relic bubble must not cover: its HP bar and attack
               countdown are the fight's counterplay. The run clock re-renders
               this screen 5x/s, so the ref is live long before a chip is tapped. */
            stageEl={stageRef.current} />
        )}

        {/* Stage: enemy / boss / star track */}
        <div ref={stageRef} data-adv-slot="stage" className="mt-3 min-h-[5.5rem] flex items-center">
          {lvl && !lvl.isBoss && !isElite
            ? <FoeTarget world={world} score={shownScore} stars={lvl.stars} lastHit={lastHit}
                combat={run.phase === 'playing' ? run.combat : null} dispatchCombat={run.dispatchCombat} />
            : <LevelStage world={world} run={run} lastHit={lastHit} popups={popups} onFinaleDone={onFinaleDone} />}
        </div>

        {lvl && (
          <div data-adv-slot="panel">
            <VariantPanel lvl={lvl} language={language} targets={run.targets} targetsFound={run.targetsFound}
              chainLetter={run.chainLetter} chainLinks={run.words.length} chainBrokenAt={chainBrokenAt}
              bombs={variant.bombs} fogThinning={variant.fogThinning} />
          </div>
        )}

        {/* Board — sized to the slot's SHORT side so it never spills over the HUD / tray above. */}
        <div data-adv-slot="board" className="relative flex-1 flex items-center justify-center min-h-0 [--adv-board-max:420px] [container-type:size] [&_.game-board-frame]:[--board-size:min(100cqw,100cqh,var(--adv-board-max))]">
          {/* Unmounted once the result screen is up: the board's body-portaled hit sticker (z-65) sat on top of it. */}
          {run.grid.length > 0 && (run.phase !== 'done' || holdResult) && (
            <div className="relative flex justify-center" style={{ width: 'min(100cqw, 100cqh, var(--adv-board-max))' }}>
            <BoardFx lastHit={lastHit} hitPath={hitPath} active={run.phase === 'playing'} shaking={run.frozen.size > 0} targetRef={stageRef} screenRef={screenRef}
              targetHp={lvl?.isBoss || isElite ? run.bossHp : lvl ? Math.max(0, (lvl.stars[2] || 1) - shownScore) : null} hintCells={hintTiles}>
              {gridElement}
            </BoardFx>
            <BoardHazards world={world} combat={run.combat} dispatchCombat={run.dispatchCombat} playing={run.phase === 'playing'} />
            </div>
          )}
          {run.grid.length > 0 && variant.active && (
            <BoardLayer fog={variant.fog} bombs={variant.bombs} pops={variant.pops} size={run.grid.length} />
          )}
        </div>

        {lvl && (
          <div data-adv-slot="hint" className="mt-2 flex justify-center">
            <HintButton hintsLeft={run.hintsLeft} onHint={onHint} disabled={run.phase !== 'playing'} />
          </div>
        )}
        <div data-adv-slot="words" className="shrink-0"><FoundWords words={run.words} points={run.points} /></div>
      </div>
      )}

      {/* The card shows the clock the level really starts with (hourglass relic etc.), not the table's base seconds. */}
      {run.phase === 'ready' && lvl && <LevelIntro world={world} level={shownLevel} floor={floor} lvl={{ ...lvl, seconds: secs }} onBegin={begin} onExit={onExit} />}

      {run.phase === 'playing' && <DeedStamp event={deed} />}
      {/* Ordinary fights: the rival's swing as a watched shot, not a line of HUD text. */}
      {run.phase === 'playing' && lvl && !isCombatKind(lvl.kind) && run.combat && (
        <RivalAttack combat={run.combat} feed={run.combatFx ?? []} />
      )}

      {run.phase === 'draft' && run.offer && <DraftOverlay offer={run.offer} onPick={run.choosePick} run={run.run} />}

      {/* The act map is the base surface of a run: the node screens (shop / rest /
          treasure / event, phase 'node') sit ON TOP of it, so dismissing one reveals
          the map with the next row already lit. */}
      {mapFirst && run.map && (mapOwnsScreen || recap) && (
        <RunMapScreen
          world={world} map={run.map} run={run.runShown ?? run.run}
          currentNode={run.currentNode} reachable={run.reachable} cleared={cleared}
          onChoose={run.chooseNode} onLeave={onMapExit}
          recap={recap} covered={nodeScreenUp}
          /* A cleared world opens the next one (the haul rides along via the carry
             token); only a run that died starts this world over. */
          onNewRun={recap ? () => { setRecap(false); if (run.result?.runComplete && hasNext) onNext(); else restartRun(); } : undefined}
        />
      )}

      {/* Shop / campfire / chest / event, over the map. It stays mounted through the
          'loading' a choice puts the run into (`busy`), or every purchase would
          unmount the shop mid-flight and flash the loader. */}
      {nodeScreenUp && run.nodeState && run.run && (
        <NodeScreen
          state={run.nodeState} run={run.run} world={world} busy={run.phase === 'loading'}
          onChoice={run.nodeChoice} onLeave={() => setLeftNode(run.run?.node ?? null)}
        />
      )}

      {(run.phase === 'loading' || (run.phase === 'saving' && !resultHeld(stageCombat, false)) || run.phase === 'error') && (
        <RunStatusOverlay phase={run.phase} onExit={onExit} onRetry={run.retry} />
      )}

      {run.phase === 'done' && run.result && lvl && !holdResult && !recap && (
        <RunResult world={world} isBoss={lvl.isBoss} result={run.result} hasNext={mapFirst && !run.result.runComplete ? true : hasNext}
          run={run.runShown}
          /* The act map, so the run recap can itemize the node kinds walked. */
          map={run.map}
          /* Hearts LEFT after this node. `/complete` returns no `nextRun` on a
             boss win (the chain ends there), so the stored run's hp is the hp
             the fight STARTED with — only this live value can say whether the
             act was cleared without losing a heart. */
          hpLeft={run.hp}
          maxHp={run.maxHp}
          /* In a run, "next" is the map: retry() re-reads the stored run token, so the
             draft (if one is pending) comes first and the act map after it. */
          onNext={mapFirst && !run.result.runComplete ? run.retry : onNext}
          onRestartRun={restartRun} onRetry={run.retry}
          /* A finished run leaves the map up as a recap of the path walked. */
          onMap={mapFirst ? (run.result.runComplete || run.result.runOver ? () => setRecap(true) : run.retry) : onExit}
          onEquipSkin={onEquipSkin} />
      )}
    </div>
  );
}
