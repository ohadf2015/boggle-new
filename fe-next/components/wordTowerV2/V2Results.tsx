import { type ReactNode, useEffect, useState } from 'react';
import { Hammer, Home, Medal, Send, Target, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { useMasterMute } from '@/hooks/useMasterMute';
import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import { ACHIEVEMENTS, type RunStats, emptyStats, progressOf } from '@/lib/wordTowerV2/achievements';
import { floorsAt } from '@/lib/wordTowerV2/biomes';
import type { RunState } from '@/lib/wordTowerV2/run';
import type { PayoutStatus } from './rewards/useRunPayout';
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
  /** Server payout status (pending/paid/none coins). */
  payoutStatus?: PayoutStatus;
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
  /** Rank on today's daily board after the one attempt. */
  dailyRank?: number | null;
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

function ResultsMute() {
  const { allMuted, toggle, label, title } = useMasterMute();
  return (
    <button
      type="button"
      data-testid="v2-results-mute"
      onClick={toggle}
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      className="absolute start-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-8 w-8 items-center justify-center rounded-neo border-neo border-black bg-neo-cream text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
    >
      {allMuted
        ? <VolumeX className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        : <Volume2 className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
    </button>
  );
}

export function V2Results({ t, peakM, score, bestM, isBest, run, badges, unlocked, stats: runStats, payoutStatus, onRestart, onHome, onClose, smashLabel, onSmash, onShare, extra, rivals, recapSrc, dailyLocked, dailyRank }: Props) {
  // Own mute in the card header → the global FAB stands down (no end-14 race
  // against the FAB's 2.5s/5s re-probes).
  useRegisterHeaderAudioControl();
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

  const cells: Array<{ label: string; value: string | React.ReactNode; cls: string }> = [
    { label: t('common.score'), value: score.toLocaleString(), cls: 'bg-neo-lime' },
    { label: t('wordTowerV2.results.combo'), value: `×${run.bestCombo}`, cls: 'bg-neo-orange' },
    { label: t('wordTowerV2.results.tenants'), value: String(run.tenants), cls: 'bg-neo-cyan' },
    { label: t('wordTowerV2.results.crates'), value: String(run.crates), cls: 'bg-neo-yellow' },
  ];

  // Add coins cell based on payout status
  if (payoutStatus) {
    let coinsValue: string | React.ReactNode = '—';
    let coinsCls = 'bg-neo-cream';
    if (payoutStatus.status === 'pending') {
      coinsValue = <span title={t('wordTowerV2.results.coinsLoading')}>{t('wordTowerV2.results.coinsLoading')}</span>;
      coinsCls = 'bg-neo-cream opacity-60';
    } else if (payoutStatus.status === 'paid') {
      coinsValue = payoutStatus.coins.toLocaleString();
      coinsCls = 'bg-neo-lime';
    }
    cells.push({ label: t('common.coins'), value: coinsValue, cls: coinsCls });
  }

  return (
    <>
      {/* The backdrop is flex flex-col: scroller (holds card) and bar (holds CTAs).
          The raid is a SIBLING of the backdrop: a full-screen raid sits on top. */}
      <div
        data-wt2-results-backdrop
        className="absolute inset-0 z-40 flex flex-col bg-neo-navy/75"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          // Close if clicking the backdrop itself or the scroller padding (outside card)
          if (target === e.currentTarget || target.hasAttribute('data-wt2-results-scroll')) {
            onClose();
          }
        }}
      >
      {/* Scroller: card content scrolls here, click-outside closes. */}
      <div
        data-wt2-results-scroll
        className="min-h-0 flex-1 overflow-y-auto p-4 pt-[max(1rem,env(safe-area-inset-top))]"
      >
      {/* A centred phone-width modal on a 1920 screen is two dead columns of
          navy — the rules count that against us. With a board to show, the card
          goes wide and splits: scorecard one side, the rivals the other. */}
      <div data-wt2-results-center className={`mx-auto flex min-h-full w-full max-w-sm items-center ${rivals ? 'md:max-w-5xl lg:max-w-6xl' : 'md:max-w-2xl'}`}>
      <div className={`relative w-full rounded-neo border-neo-thick border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg animate-neo-pop md:p-6 ${rivals ? 'md:flex md:items-start md:gap-6' : ''}`}>
      <div className={rivals ? 'md:w-[22rem] md:shrink-0 lg:w-[26rem]' : 'contents'}>
        <ResultsMute />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('wordTowerV2.results.close')}
          className="absolute end-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-8 w-8 items-center justify-center rounded-neo border-neo border-black bg-neo-cream text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        {/* `px-12` keeps the title clear of the close (end-3) and mute (start-3). */}
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
        </div>
      </div>
      </div>
      </div>

      {/* Sticky bottom bar: Home and Play Again buttons never scroll away. */}
      <div data-wt2-results-actions className="shrink-0 border-t border-neo-navy bg-neo-navy/75 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0">
        <div className="mx-auto flex max-w-sm items-center justify-between gap-2">
          {dailyLocked ? (
            <>
              <div className="flex-1">
                <p className="font-neo-display text-sm font-bold text-neo-cream">{t('wordTowerV2.dailyPlayed')}</p>
                {dailyRank ? (
                  <p className="font-neo-display text-base font-black text-neo-cream">{t('wordTowerV2.dailyRank', { rank: dailyRank })}</p>
                ) : null}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestart();
              }}
              autoFocus
              className="flex-1 rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-3 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              {t('common.playAgain')}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHome();
            }}
            aria-label={t('wordTowerV2.results.home')}
            className="flex h-14 w-14 items-center justify-center rounded-neo border-neo border-black bg-neo-navy text-neo-cream shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <Home className="h-5 w-5" aria-hidden />
          </button>
          {onShare ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              aria-label={t('wordTowerV2.wreck.share')}
              title={t('wordTowerV2.wreck.share')}
              className="flex h-14 w-14 items-center justify-center rounded-neo border-neo border-black bg-neo-cyan text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <Send className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
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
