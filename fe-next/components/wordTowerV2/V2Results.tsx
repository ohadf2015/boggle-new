import { type ReactNode, useEffect, useState } from 'react';
import { Hammer, Home, Medal, Send, Target, Trophy, X } from 'lucide-react';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import { ACHIEVEMENTS, type RunStats, emptyStats, progressOf } from '@/lib/wordTowerV2/achievements';
import { floorsAt } from '@/lib/wordTowerV2/biomes';
import type { RunState } from '@/lib/wordTowerV2/run';
import type { RevengeEntry, RivalView, UseEstate } from './useEstate';
import { RaidFlow } from './rivals/RaidFlow';
import { RivalBoard } from './rivals/RivalBoard';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  peakM: number;
  score: number;
  bestM: number;
  isBest: boolean;
  run: RunState;
  /** Badges unlocked during this run. */
  badges: string[];
  /** Every badge ever unlocked (to pick the next goal). */
  unlocked: Set<string>;
  /** Full run stats (longest word, welds…) — the run state alone lacks them. */
  stats?: RunStats;
  onRestart: () => void;
  /** Leave the game entirely. The run is over; trapping the player here is not a choice. */
  onHome: () => void;
  /** Dismiss the card and look at the tower that just fell. */
  onClose: () => void;
  smashLabel?: string;
  onSmash?: () => void;
  onShare?: () => void;
  /** Extra actions under the buttons (the empire entry lives here). */
  extra?: ReactNode;
  /** Graphic recap PNG (doctrine: recap is a picture, not emoji text). */
  recapSrc?: string;
  /** Daily one-run lock — hide play-again. */
  dailyLocked?: boolean;
  /** Everything the rival board + raid round need; absent = no board (tests, demo). */
  rivals?: {
    estate: UseEstate;
    /** Wrecking balls this run banked — they carry into a raid. */
    balls: number;
    reducedMotion: boolean;
    /** Your run's tower, so the comparison shows what you actually built. */
    myTower: TowerBlock[];
    /** A raid takes the whole screen: the parent pauses the game canvas. */
    onRaidOpen: (open: boolean) => void;
  };
}

/** The locked badge this run came closest to — a reason for one more go. */
function nextGoal(stats: RunStats, skip: Set<string>) {
  let best: { id: string; current: number; goal: number } | null = null;
  let bestFrac = -1;
  for (const a of ACHIEVEMENTS) {
    if (skip.has(a.id)) continue;
    const p = progressOf(a, stats);
    const frac = p.current / p.goal;
    if (frac < 1 && frac > bestFrac) {
      bestFrac = frac;
      best = { id: a.id, ...p };
    }
  }
  return best;
}

export function V2Results({ t, peakM, score, bestM, isBest, run, badges, unlocked, stats: runStats, onRestart, onHome, onClose, smashLabel, onSmash, onShare, extra, rivals, recapSrc, dailyLocked }: Props) {
  // `revenge` is the raid being answered, not a flag: its numbers ride the whole
  // raid so the payout can name the debt it settled.
  const [target, setTarget] = useState<{ rival: RivalView; revenge: RevengeEntry | null } | null>(null);
  const onRaidOpen = rivals?.onRaidOpen;
  useEffect(() => {
    onRaidOpen?.(target !== null);
  }, [target, onRaidOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const floors = Math.floor(floorsAt(peakM) + 0.05);
  const stats: RunStats = { ...emptyStats(), ...runStats, floors: run.floors, peakFloors: floors, bestCombo: run.bestCombo, tenants: run.tenants, crates: run.crates };
  const goal = nextGoal(stats, new Set([...unlocked, ...badges]));
  const cells = [
    { label: t('common.score'), value: score.toLocaleString(), cls: 'bg-neo-lime' },
    { label: t('wordTowerV2.results.combo'), value: `×${run.bestCombo}`, cls: 'bg-neo-orange' },
    { label: t('wordTowerV2.results.tenants'), value: String(run.tenants), cls: 'bg-neo-cyan' },
    { label: t('wordTowerV2.results.crates'), value: String(run.crates), cls: 'bg-neo-yellow' },
  ];

  return (
    <>
      {/* The scroller is the backdrop, and the raid is a SIBLING of it: a
          full-screen raid rendered inside a scrolling card scrolls away. */}
      <div
        data-wt2-results-backdrop
        className="absolute inset-0 z-40 overflow-y-auto bg-neo-navy/75 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      {/* A centred phone-width modal on a 1920 screen is two dead columns of
          navy — the rules count that against us. With a board to show, the card
          goes wide and splits: scorecard one side, the rivals the other. */}
      <div className={`mx-auto flex min-h-full w-full max-w-sm items-center ${rivals ? 'md:max-w-5xl lg:max-w-6xl' : 'md:max-w-2xl'}`}>
      <div className={`relative w-full rounded-neo border-neo-thick border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg animate-neo-pop md:p-6 ${rivals ? 'md:flex md:items-start md:gap-6' : ''}`}>
      <div className={rivals ? 'md:w-[22rem] md:shrink-0 lg:w-[26rem]' : 'contents'}>
        {/* `end-14` on a phone: the global mute FAB is pinned to this exact
            corner and probes for an obstruction only on mount and on resize,
            so a card that opens ~1.3s after the collapse is never seen — it
            sat ON this X (measured 342-382 over 327-359 at 390px). Widening
            the card past the FAB is not an option here, so the X steps in by
            the FAB's 56px instead. From md up the card is centred and nowhere
            near the viewport edge, so it keeps the corner. */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('wordTowerV2.results.close')}
          className="absolute end-14 top-[max(0.75rem,env(safe-area-inset-top))] flex h-8 w-8 items-center justify-center rounded-neo border-neo border-black bg-neo-cream text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none md:end-3"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {/* `px-12` keeps the title clear of the close button parked at `end-14`
            — at 390px "TOWER DOWN!" ran straight under the X. */}
        <h2 className="px-12 font-neo-display text-3xl font-black uppercase">{t('wordTowerV2.collapsed')}</h2>
        {recapSrc ? (
          <img
            src={recapSrc}
            alt={t('wordTowerV2.recapAlt', { floors, m: peakM.toFixed(1) })}
            className="mx-auto mt-3 w-full max-w-sm rounded-neo border-neo border-black shadow-hard-sm"
            width={1200}
            height={630}
          />
        ) : null}
        {isBest ? (
          <div className="mx-auto mt-2 flex w-fit items-center gap-1 rounded-neo border-neo border-black bg-neo-yellow px-3 py-0.5 font-neo-display text-sm font-bold">
            <Trophy className="h-4 w-4" aria-hidden />
            {t('wordTowerV2.newBest')}
          </div>
        ) : null}
        <div className="mt-3 flex items-end justify-center gap-3" aria-label={t('wordTowerV2.results.floorsA11y', { n: floors })}>
          <div className="flex flex-col leading-none" aria-hidden>
            <span className="font-neo-display text-xs font-black uppercase tracking-widest">{t('wordTowerV2.hud.floor')}</span>
            <span className="font-neo-display text-7xl font-black tabular-nums">{floors}</span>
          </div>
          <div className="mb-2 flex flex-col items-start font-neo-display font-bold tabular-nums" aria-hidden>
            <span className="text-2xl">
              {peakM.toFixed(1)}
              {t('wordTowerV2.unitM')}
            </span>
            {/* Only when the best is a DIFFERENT number. On a new best it is
                the run's own height printed twice under a "New best!" pill
                that already said so — three ways of saying one thing. */}
            {bestM > peakM + 0.05 ? (
              <span className="flex items-center gap-1 text-sm opacity-70">
                <Trophy className="h-3.5 w-3.5" aria-hidden />
                {bestM.toFixed(1)}
                {t('wordTowerV2.unitM')}
              </span>
            ) : null}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 font-neo-display">
          {cells.map((c) => (
            <div key={c.label} className={`rounded-neo border-neo border-black p-2 ${c.cls}`}>
              <dt className="text-[11px] font-bold uppercase">{c.label}</dt>
              <dd className="text-lg font-black tabular-nums">{c.value}</dd>
            </div>
          ))}
        </dl>
        {badges.length > 0 ? (
          <div className="mt-4">
            <h3 className="font-neo-display text-xs font-black uppercase tracking-widest">{t('wordTowerV2.results.badges')}</h3>
            <ul className="mt-1.5 flex flex-wrap justify-center gap-1.5">
              {badges.map((id) => (
                <li key={id} className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-purple px-2 py-0.5 font-neo-display text-xs font-bold shadow-hard-sm">
                  <Medal className="h-3.5 w-3.5" aria-hidden />
                  {t(`wordTowerV2.ach.${id}.name`)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {goal ? (
          <div className="mt-4 rounded-neo border-neo border-black bg-neo-navy p-2 text-start text-neo-cream">
            <div className="flex items-center gap-1.5 font-neo-display text-[11px] font-black uppercase tracking-widest text-neo-lime">
              <Target className="h-3.5 w-3.5" aria-hidden />
              {t('wordTowerV2.results.nextGoal')}
            </div>
            <div className="mt-0.5 font-neo-display text-sm font-bold">{t(`wordTowerV2.ach.${goal.id}.desc`)}</div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm border-2 border-neo-cream/40 bg-neo-navy-light" role="progressbar" aria-valuemin={0} aria-valuemax={goal.goal} aria-valuenow={goal.current}>
              <div className="h-full bg-neo-lime" style={{ width: `${(goal.current / goal.goal) * 100}%` }} />
            </div>
          </div>
        ) : null}
        </div>
        <div className={rivals ? 'md:min-w-0 md:flex-1' : 'contents'}>
        {rivals ? (
          <RivalBoard
            t={t}
            estate={rivals.estate}
            myTower={rivals.myTower}
            myHeightM={peakM}
            onPick={(rival, revenge) => setTarget({ rival, revenge })}
          />
        ) : null}
        {/* ONE primary action. Daily one-run: the replay button is the cheat. */}
        {dailyLocked ? (
          <p className="mt-5 font-neo-display text-sm font-bold">{t('wordTowerV2.dailyPlayed')}</p>
        ) : (
          <button
            type="button"
            onClick={onRestart}
            autoFocus
            className="mt-5 w-full rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-3 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            {t('common.playAgain')}
          </button>
        )}

        {/* Secondary: the empire, and the smash round when there is a tower to
            smash. Side by side so the card does not grow a button stack. */}
        <div className="mt-3 flex gap-2">
          {extra ? <div className="min-w-0 flex-1">{extra}</div> : null}
          {onSmash && smashLabel ? (
            <button
              type="button"
              onClick={onSmash}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-2.5 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              <Hammer className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate">{smashLabel}</span>
            </button>
          ) : null}
        </div>

        {/* Tertiary: leaving, and sharing. Icon-sized — they are not the point
            of this screen, but the player must never be stuck on it. */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onHome}
            aria-label={t('wordTowerV2.results.home')}
            className="flex items-center gap-1.5 rounded-neo border-neo border-black bg-neo-navy px-3 py-1.5 font-neo-display text-sm font-bold text-neo-cream shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <Home className="h-4 w-4" aria-hidden />
            <span aria-hidden>{t('wordTowerV2.results.home')}</span>
          </button>
          {onShare ? (
            <button
              type="button"
              onClick={onShare}
              className="flex items-center gap-1.5 rounded-neo border-neo border-black bg-neo-cyan px-3 py-1.5 font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Send className="h-4 w-4" aria-hidden />
              {t('wordTowerV2.wreck.share')}
            </button>
          ) : null}
        </div>
        </div>
      </div>
      </div>
      </div>
      {rivals && target ? (
        <RaidFlow
          t={t}
          estate={rivals.estate}
          rival={target.rival}
          revenge={!!target.revenge}
          grievance={target.revenge}
          balls={rivals.balls}
          reducedMotion={rivals.reducedMotion}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </>
  );
}
