import { type ReactNode, useEffect, useState } from 'react';
import { Hammer, Medal, Send, Target, Trophy } from 'lucide-react';
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
  smashLabel?: string;
  onSmash?: () => void;
  onShare?: () => void;
  /** Extra actions under the buttons (the empire entry lives here). */
  extra?: ReactNode;
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

export function V2Results({ t, peakM, score, bestM, isBest, run, badges, unlocked, stats: runStats, onRestart, smashLabel, onSmash, onShare, extra, rivals }: Props) {
  // `revenge` is the raid being answered, not a flag: its numbers ride the whole
  // raid so the payout can name the debt it settled.
  const [target, setTarget] = useState<{ rival: RivalView; revenge: RevengeEntry | null } | null>(null);
  const onRaidOpen = rivals?.onRaidOpen;
  useEffect(() => {
    onRaidOpen?.(target !== null);
  }, [target, onRaidOpen]);
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
      <div className="absolute inset-0 z-40 overflow-y-auto bg-neo-navy/75 p-4" role="dialog" aria-modal="true">
      {/* A centred phone-width modal on a 1920 screen is two dead columns of
          navy — the rules count that against us. With a board to show, the card
          goes wide and splits: scorecard one side, the rivals the other. */}
      <div className={`mx-auto flex min-h-full w-full max-w-sm items-center ${rivals ? 'md:max-w-5xl lg:max-w-6xl' : 'md:max-w-2xl'}`}>
      <div className={`w-full rounded-neo border-neo-thick border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg animate-neo-pop md:p-6 ${rivals ? 'md:flex md:items-start md:gap-6' : ''}`}>
      <div className={rivals ? 'md:w-[22rem] md:shrink-0 lg:w-[26rem]' : 'contents'}>
        <h2 className="font-neo-display text-3xl font-black uppercase">{t('wordTowerV2.collapsed')}</h2>
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
            <span className="flex items-center gap-1 text-sm opacity-70">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              {bestM.toFixed(1)}
              {t('wordTowerV2.unitM')}
            </span>
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
        {onSmash && smashLabel ? (
          <button
            type="button"
            onClick={onSmash}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            <Hammer className="h-5 w-5" aria-hidden />
            {smashLabel}
          </button>
        ) : null}
        {onShare ? (
          <button
            type="button"
            onClick={onShare}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-cyan px-6 py-2 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            <Send className="h-5 w-5" aria-hidden />
            {t('wordTowerV2.wreck.share')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRestart}
          autoFocus
          className="mt-3 w-full rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-3 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          {t('common.playAgain')}
        </button>
        {extra}
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
