'use client';

/**
 * Adventure level screen — the classic board (GridComponent) wearing the
 * world's tile skin, over the world backdrop, with a star meter or boss fight.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Timer, Loader2 } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { scoreWords } from '@/lib/adventure/play/scoreRun';
import { worldSkinId } from '@/lib/adventure/play/worldSkins';
import type { AdventureAchievementId } from '@/utils/adventureAchievementUtils';
import { useAdventureRun } from './useAdventureRun';
import { useWordChecker } from './useWordChecker';
import LevelStage from './stage/LevelStage';
import BoardHazards from './stage/BoardHazards';
import LevelIntro from './intro/LevelIntro';
import BoardFx from './fx/BoardFx';
import FoeTarget from './fx/FoeTarget';
import FoundWords from './fx/FoundWords';
import HintButton from './fx/HintButton';
import { hintCells, resolveHitPath, type Cell } from './fx/hintPath';
import type { HitEvent } from './events';
import RunResult from './RunResult';
import RunHud from './RunHud';
import { foeScore } from './foeScore';
import { resultHeld, FINALE_HOLD_MAX_MS } from './finaleHold';
import DeedStamp, { type DeedEvent } from './deed/DeedStamp';
import { deedTier, DEED_DROPS_PER_LEVEL } from './deed/deedTier';
import { castTiming } from './fx/castPath';
import { hitTier } from './fx/hitTier';
import DraftOverlay from './DraftOverlay';
import { useLevelVariant } from './variants/useLevelVariant';
import VariantPanel from './variants/VariantPanel';
import BoardLayer from './variants/BoardLayer';
import { cn } from '@/lib/utils';

export const worldBackdrop = (world: number) => `/images/adventure/play/world-${world}.webp`;

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
}

export default function AdventureLevel({ world, level, hasNext, onExit, onNext, onRestartRun, onSaved, onEquipSkin, earnAchievement, totalBossesBeaten, otherPerfectLevels }: Props) {
  const { t, language } = useLanguageSafe();
  const sfx = useSoundEffects();
  const isWord = useWordChecker(language);
  const run = useAdventureRun({ world, level, language, isWord });
  const [feedback, setFeedback] = useState<WordFeedback | null>(null);
  const [popups] = useState<Array<{ id: number; pts: number }>>([]); // "+N" chip replaced by the WordCast damage number
  const streakRef = useRef(0);
  const invalidRef = useRef(0);
  const hitSeq = useRef(0); // monotonic hit id: two submits in one ms must not collide
  const worldCfg = getWorldConfig(world);
  const lvl = run.lvl;
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
  const variantOnPath = variant.onPath;
  const onPathSubmit = useCallback((cells: Cell[]) => { tracedRef.current = cells.map(({ row, col }) => ({ row, col })); variantOnPath(cells); }, [variantOnPath]);

  const onWordSubmit = useCallback(async (word: string) => {
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
      // Same relic/chain formula the server settles with (points of the word just added).
      const all = scoreWords([...run.words, word.toLowerCase().trim()], { relics: run.run?.relics ?? [], kind: lvl?.kind }).points;
      const pts = all[all.length - 1] ?? 0;
      sfx.playWordAcceptedSound?.();
      setFeedback({ id, type: 'accepted', word, score: pts, timestamp: seq });
      let praiseKey: string | undefined;
      if (lvl) {
        // `run` is this render's (pre-hit) state: the fight's HP, or the score foe's bar.
        const huntDone = run.targetsFound.length >= (lvl.huntCount ?? run.targets?.length ?? 0);
        const hpBefore = run.combat ? run.combat.enemyHp : Math.max(0, lvl.stars[2] - foeScore({ score: run.score, top: lvl.stars[2], kind: lvl.kind, huntMet: huntDone }));
        const maxHp = run.combat ? run.combat.enemyMaxHp : lvl.stars[2];
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
  }, [run, sfx, lvl, language, earnAchievement, variant]);

  const onHint = useCallback(() => {
    const w = run.takeHint();
    if (w) { setHintWord(w); sfx.playHintRevealSound?.(); }
  }, [run, sfx]);
  // The hint glows on the board until that word is found.
  const hintTiles = useMemo(
    () => (hintWord && run.phase === 'playing' && !run.words.includes(hintWord.toLowerCase()) ? hintCells(hintWord, run.grid, language, run.revealFullHint) : []),
    [hintWord, run.phase, run.words, run.grid, language, run.revealFullHint],
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
  }, [run.result, lvl, onSaved, earnAchievement, totalBossesBeaten, otherPerfectLevels]);

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

  const holdResult = resultHeld(run.combat, finaleDone);
  useEffect(() => {
    if (!holdResult || run.phase !== 'done') return;
    const id = setTimeout(() => setFinaleDone(true), FINALE_HOLD_MAX_MS);
    return () => clearTimeout(id);
  }, [holdResult, run.phase]);

  const secs = Math.ceil(run.msLeft / 1000);
  const urgent = run.phase === 'playing' && secs <= 10;
  const variantFilter = variant.cellFilter;
  const frozenFilter = useMemo(() => (r: number, c: number) => !run.frozen.has(`${r}-${c}`) && variantFilter(r, c), [run.frozen, variantFilter]);

  return (
    <div ref={screenRef} className="fixed inset-0 z-50 overflow-hidden bg-[#0f1b3d] text-neo-cream">
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative backdrop */}
      <img src={worldBackdrop(world)} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,16,40,0.55)_0%,rgba(10,16,40,0.15)_70%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-lg flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Top bar */}
        <div className="flex items-center gap-2 pe-11">
          <button type="button" onClick={onExit} aria-label={t('adventurePlay.backToMap')}
            className="rounded-xl border-[3px] border-black bg-neo-cream text-black p-2 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="flex-1 min-w-0 rounded-xl border-[3px] border-black bg-black/60 px-3 py-1.5">
            <div className="text-[11px] uppercase tracking-wider opacity-80 truncate">{worldCfg ? t(`adventure.worlds.${worldCfg.name}`) : ''}</div>
            <div className="font-neo-display font-bold leading-tight">
              {lvl?.isBoss ? t('adventurePlay.bossLevel') : isElite ? t('adventurePlay.eliteLevel') : t('adventurePlay.worldLevel', { world, level })}
            </div>
          </div>
          <div className={cn('rounded-xl border-[3px] border-black px-3 py-2 font-neo-display font-bold tabular-nums inline-flex items-center gap-1 shadow-[3px_3px_0_#000]',
            urgent ? 'bg-neo-pink text-black animate-pulse' : 'bg-neo-yellow text-black')}>
            <Timer className="w-4 h-4" /> {secs}
          </div>
        </div>

        {/* Stage: enemy / boss / star track */}
        <div ref={stageRef} className="mt-3 min-h-[5.5rem] flex items-center">
          {lvl && !lvl.isBoss && !isElite
            ? <FoeTarget world={world} score={shownScore} stars={lvl.stars} lastHit={lastHit} />
            : <LevelStage world={world} run={run} lastHit={lastHit} popups={popups} onFinaleDone={onFinaleDone} />}
        </div>

        {lvl && (
          <RunHud hp={run.hp} maxHp={run.maxHp} gold={run.run?.gold ?? 0} combat={run.combat} dispatchCombat={run.dispatchCombat}
            potionsLeft={run.potionsLeft} onPotion={run.drinkPotion}
            goal={goal} playing={run.phase === 'playing'}
            relics={run.runShown?.relics ?? []} lastHit={lastHit} words={run.words}
            world={world} level={level} kind={lvl.kind} seconds={lvl.seconds} combatControls={false} />
        )}
        {lvl && (
          <VariantPanel lvl={lvl} language={language} targets={run.targets} targetsFound={run.targetsFound}
            chainLetter={run.chainLetter} chainLinks={run.words.length} chainBrokenAt={chainBrokenAt}
            bombs={variant.bombs} fogThinning={variant.fogThinning} />
        )}

        {/* Board — sized to the slot's SHORT side so it never spills over the HUD / tray above. */}
        <div className="relative flex-1 flex items-center justify-center min-h-0 [container-type:size] [&_.game-board-frame]:[--board-size:min(100cqw,100cqh,420px)]">
          {/* Unmounted once the result screen is up: the board's body-portaled hit sticker (z-65) sat on top of it. */}
          {run.grid.length > 0 && (run.phase !== 'done' || holdResult) && (
            <div className="flex justify-center" style={{ width: 'min(100cqw, 100cqh, 420px)' }}>
            <BoardFx lastHit={lastHit} hitPath={hitPath} active={run.phase === 'playing'} shaking={run.frozen.size > 0} targetRef={stageRef} screenRef={screenRef}
              targetHp={lvl?.isBoss || isElite ? run.bossHp : lvl ? Math.max(0, (lvl.stars[2] || 1) - shownScore) : null} hintCells={hintTiles}>
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
                hideComboIndicator
              />
              <BoardHazards world={world} combat={run.combat} dispatchCombat={run.dispatchCombat} playing={run.phase === 'playing'} />
            </BoardFx>
            </div>
          )}
          {run.grid.length > 0 && variant.active && (
            <BoardLayer fog={variant.fog} bombs={variant.bombs} pops={variant.pops} size={run.grid.length} />
          )}
        </div>

        {lvl && (
          <div className="mt-2 flex justify-center">
            <HintButton hintsLeft={run.hintsLeft} onHint={onHint} disabled={run.phase !== 'playing'} />
          </div>
        )}
        <FoundWords words={run.words} points={run.points} />
      </div>

      {/* The card shows the clock the level really starts with (hourglass relic etc.), not the table's base seconds. */}
      {run.phase === 'ready' && lvl && <LevelIntro world={world} level={level} lvl={{ ...lvl, seconds: secs }} onBegin={begin} onExit={onExit} />}

      {run.phase === 'playing' && <DeedStamp event={deed} />}

      {run.phase === 'draft' && run.offer && <DraftOverlay offer={run.offer} onPick={run.choosePick} run={run.run} />}

      {(run.phase === 'loading' || (run.phase === 'saving' && !resultHeld(run.combat, false))) && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/40" role="status">
          <div className="inline-flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#1a1a2e] px-4 py-3 font-bold">
            <Loader2 className="w-5 h-5 animate-spin" /> {run.phase === 'saving' ? t('adventurePlay.saving') : t('adventurePlay.loading')}
          </div>
        </div>
      )}

      {run.phase === 'error' && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 p-4">
          <div className="max-w-xs rounded-2xl border-[3px] border-black bg-[#1a1a2e] p-5 text-center">
            <p className="font-bold">{t('adventurePlay.loadError')}</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={onExit} className="flex-1 rounded-xl border-[3px] border-black bg-neo-cream text-black font-bold py-2">{t('adventurePlay.backToMap')}</button>
              <button type="button" onClick={run.retry} className="flex-1 rounded-xl border-[3px] border-black bg-neo-cyan text-black font-bold py-2">{t('adventurePlay.tryAgain')}</button>
            </div>
          </div>
        </div>
      )}

      {run.phase === 'done' && run.result && lvl && !holdResult && (
        <RunResult world={world} isBoss={lvl.isBoss} result={run.result} hasNext={hasNext}
          run={run.runShown} onNext={onNext} onRestartRun={onRestartRun} onRetry={run.retry} onMap={onExit} onEquipSkin={onEquipSkin} />
      )}
    </div>
  );
}
