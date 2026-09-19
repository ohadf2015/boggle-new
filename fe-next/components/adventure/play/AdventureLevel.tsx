'use client';

/**
 * Adventure level screen — the classic board (GridComponent) wearing the
 * world's tile skin, over the world backdrop, with a star meter or boss fight.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Star, Timer, Loader2 } from 'lucide-react';
import GridComponent from '@/components/GridComponent';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { getWorldConfig } from '@/lib/adventure/worldConfig';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import { wordPoints } from '@/lib/adventure/play/scoreRun';
import { worldSkinId } from '@/lib/adventure/play/worldSkins';
import type { AdventureAchievementId } from '@/utils/adventureAchievementUtils';
import { useAdventureRun } from './useAdventureRun';
import { useWordChecker } from './useWordChecker';
import BossPanel from './BossPanel';
import RunResult from './RunResult';
import { cn } from '@/lib/utils';

export const worldBackdrop = (world: number) => `/images/adventure/play/world-${world}.webp`;

interface Props {
  world: number;
  level: number;
  hasNext: boolean;
  onExit: () => void;
  onNext: () => void;
  /** Fired after a saved run so the map can refetch progress + inventory. */
  onSaved: () => void;
  onEquipSkin: (world: number) => void;
  earnAchievement: (id: AdventureAchievementId) => void;
  totalBossesBeaten: number;
  /** Levels already at 3 stars, not counting this one. */
  otherPerfectLevels: number;
}

export default function AdventureLevel({ world, level, hasNext, onExit, onNext, onSaved, onEquipSkin, earnAchievement, totalBossesBeaten, otherPerfectLevels }: Props) {
  const { t, language } = useLanguageSafe();
  const sfx = useSoundEffects();
  const isWord = useWordChecker(language);
  const run = useAdventureRun({ world, level, language, isWord });
  const [feedback, setFeedback] = useState<WordFeedback | null>(null);
  const [popups, setPopups] = useState<Array<{ id: number; pts: number }>>([]);
  const streakRef = useRef(0);
  const invalidRef = useRef(0);
  const worldCfg = getWorldConfig(world);
  const lvl = run.lvl;

  const onWordSubmit = useCallback(async (word: string) => {
    const r = await run.submitWord(word);
    if (r === 'idle') return;
    const id = `${Date.now()}`;
    if (r === 'ok') {
      const pts = wordPoints(word);
      sfx.playWordAcceptedSound?.();
      if (lvl?.isBoss) sfx.playBossHitSound?.();
      setFeedback({ id, type: 'accepted', word, score: pts, timestamp: Date.now() });
      setPopups((p) => [...p.slice(-3), { id: Date.now(), pts }]);
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
      setFeedback({ id, type: r === 'dup' ? 'duplicate' : 'rejected', word, timestamp: Date.now() });
    }
  }, [run, sfx, lvl, earnAchievement]);

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
    if (lvl?.isBoss) sfx.playBossEntranceSound?.(); else sfx.playRoundStartSound?.();
    run.begin();
  };

  const secs = Math.ceil(run.msLeft / 1000);
  const urgent = run.phase === 'playing' && secs <= 10;
  const frozenFilter = useMemo(() => (r: number, c: number) => !run.frozen.has(`${r}-${c}`), [run.frozen]);
  const top = lvl?.stars[2] ?? 1;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0f1b3d] text-neo-cream">
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
              {lvl?.isBoss ? t('adventurePlay.bossLevel') : t('adventurePlay.worldLevel', { world, level })}
            </div>
          </div>
          <div className={cn('rounded-xl border-[3px] border-black px-3 py-2 font-neo-display font-bold tabular-nums inline-flex items-center gap-1 shadow-[3px_3px_0_#000]',
            urgent ? 'bg-neo-pink text-black animate-pulse' : 'bg-neo-yellow text-black')}>
            <Timer className="w-4 h-4" /> {secs}
          </div>
        </div>

        {/* Meter: boss HP or star track */}
        <div className="mt-3 min-h-[5.5rem] flex items-center">
          {lvl?.isBoss && run.boss ? (
            <BossPanel world={world} hp={run.bossHp} hpMax={lvl.bossHp} phase={run.boss} hitCount={run.words.length} attackCount={run.bossHits} />
          ) : lvl ? (
            <div className="w-full rounded-xl border-[3px] border-black bg-black/60 px-3 pt-1.5 pb-3 shadow-[3px_3px_0_#000]">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold uppercase tracking-wide opacity-80">{t('adventurePlay.score')}</span>
                <span className="relative font-neo-display font-bold text-2xl tabular-nums">
                  {run.score}
                  {popups.map((p) => (
                    <span key={p.id} className="absolute -top-2 end-0 translate-x-full ps-1 text-neo-lime text-base animate-[adv-float-up_0.8s_ease-out_forwards]">+{p.pts}</span>
                  ))}
                </span>
              </div>
              <div className="relative mt-1 h-5 rounded-full border-[3px] border-black bg-black/60">
                <div className="h-full rounded-full bg-neo-lime transition-[width] duration-300" style={{ width: `${Math.min(100, (run.score / top) * 100)}%` }} />
                {lvl.stars.map((s, i) => (
                  <Star key={i} className={cn('absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-6 h-6 stroke-black stroke-[2.5]', run.score >= s ? 'fill-neo-yellow' : 'fill-[#2a2a4e]')}
                    style={{ insetInlineStart: `${(s / top) * 100}%` }} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Board */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          {run.grid.length > 0 && (
            <div className={cn('w-full max-w-[420px]', run.frozen.size > 0 && 'animate-[adv-shake_0.35s_ease-in-out]')}>
              <GridComponent
                grid={run.grid}
                interactive={run.phase === 'playing'}
                onWordSubmit={onWordSubmit}
                language={language}
                tileSkinOverride={worldSkinId(world)}
                frozenTiles={run.frozen}
                cellFilter={frozenFilter}
                submitFeedback={feedback}
                hideComboIndicator
              />
            </div>
          )}
        </div>

        {/* Found words */}
        <ul className="mt-2 flex flex-wrap gap-1.5 justify-center max-h-20 overflow-y-auto" aria-label={t('adventurePlay.foundWords')}>
          {run.words.slice(-14).map((w) => (
            <li key={w} className="rounded-full border-2 border-black bg-neo-cream text-black text-xs font-bold px-2 py-0.5 uppercase">
              {w} <span className="opacity-60">+{wordPoints(w)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Intro */}
      {run.phase === 'ready' && lvl && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm rounded-2xl border-[3px] border-black bg-[#1a1a2e] shadow-[6px_6px_0_#000] p-5 text-center">
            {lvl.isBoss && getBossConfig(world) && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- boss portrait */}
                <img src={getBossConfig(world)!.images.idle} alt="" className="mx-auto h-40 object-contain drop-shadow-[4px_4px_0_#000]" />
                <div className="font-neo-display text-2xl font-bold mt-1">{t(getBossConfig(world)!.displayName)}</div>
              </>
            )}
            {!lvl.isBoss && (
              <div className="font-neo-display text-2xl font-bold">{t('adventurePlay.worldLevel', { world, level })}</div>
            )}
            <p className="mt-2 text-sm opacity-90">
              {lvl.isBoss ? t('adventurePlay.bossGoal', { hp: lvl.bossHp, seconds: lvl.seconds }) : t('adventurePlay.goal', { score: lvl.stars[0], seconds: lvl.seconds })}
            </p>
            <button type="button" onClick={begin} autoFocus
              className={cn('mt-4 w-full rounded-xl border-[3px] border-black font-neo-display font-bold text-xl py-3 shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-none text-black',
                lvl.isBoss ? 'bg-neo-pink' : 'bg-neo-lime')}>
              {lvl.isBoss ? t('adventurePlay.fight') : t('adventurePlay.start')}
            </button>
          </div>
        </div>
      )}

      {(run.phase === 'loading' || run.phase === 'saving') && (
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

      {run.phase === 'done' && run.result && lvl && (
        <RunResult world={world} isBoss={lvl.isBoss} result={run.result} hasNext={hasNext}
          onNext={onNext} onRetry={run.retry} onMap={onExit} onEquipSkin={onEquipSkin} />
      )}
    </div>
  );
}
