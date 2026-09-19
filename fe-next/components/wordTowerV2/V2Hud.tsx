import { useEffect, useRef, useState } from 'react';
import { Flame, Hammer, Send, Shuffle, Trophy, Users } from 'lucide-react';
import { TOWER_SURPRISE_META } from '@/lib/wordTower/towerSurprise';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import type { LandingQuality } from '@/lib/wordTowerV2/landing';
import type { LandingEvent, SurpriseEvent } from './useTowerRun';

type T = (key: string, params?: Record<string, string | number>) => string;

const VERDICT_CLASS: Record<LandingQuality, string> = {
  perfect: 'bg-neo-lime text-neo-navy',
  good: 'bg-neo-cyan text-neo-navy',
  sloppy: 'bg-neo-yellow text-neo-navy',
  miss: 'bg-neo-red text-neo-navy',
};

/** Clears itself `ms` after each new key — one pop per event, never stacking. */
function useFlash<V extends { key: number }>(value: V | null, ms: number): V | null {
  const [shown, setShown] = useState<V | null>(null);
  useEffect(() => {
    if (!value) return;
    setShown(value);
    const id = window.setTimeout(() => setShown(null), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return shown;
}

interface Props {
  t: T;
  heightM: number;
  score: number;
  bestM: number;
  combo: number;
  scrambles: number;
  biome: WordTowerBiomeId;
  landing: LandingEvent | null;
  surprise: SurpriseEvent | null;
  newBest: boolean;
  /** Wrecking balls banked for the smash round. */
  balls?: number;
  /** Tenants who moved into the tower this run. */
  tenants?: number;
}

export function V2Hud({ t, heightM, score, bestM, combo, scrambles, biome, landing, surprise, newBest, balls, tenants }: Props) {
  const verdict = useFlash(landing, 1100);
  const pop = useFlash(surprise, 2200);

  // Zone toast: only on a CLIMB into a new biome, never on the first paint.
  const prevBiome = useRef(biome);
  const [zone, setZone] = useState<{ key: number; id: WordTowerBiomeId } | null>(null);
  useEffect(() => {
    if (prevBiome.current === biome) return;
    prevBiome.current = biome;
    setZone({ key: Date.now(), id: biome });
  }, [biome]);
  const zoneShown = useFlash(zone, 2400);

  const bestKey = useRef(0);
  const [bestToast, setBestToast] = useState<{ key: number } | null>(null);
  useEffect(() => {
    if (newBest) setBestToast({ key: ++bestKey.current });
  }, [newBest]);
  const bestShown = useFlash(bestToast, 2000);

  return (
    <>
      <div className="pointer-events-none absolute start-3 top-3 z-20 flex flex-col items-start gap-1.5" aria-live="polite">
        <div
          className="rounded-neo border-neo-thick border-black bg-neo-lime px-3 py-0.5 font-neo-display text-3xl font-black tabular-nums text-neo-navy shadow-hard"
          aria-label={t('wordTower.a11y.height', { m: heightM.toFixed(1) })}
        >
          {heightM.toFixed(1)}
          <span className="ms-0.5 text-lg">{t('wordTowerV2.unitM')}</span>
        </div>
        <div className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy/85 px-2 py-0.5 font-neo-display text-lg font-bold tabular-nums text-neo-cream">
          {score.toLocaleString()}
        </div>
        <div className="flex gap-1.5">
          {bestM > 0.5 ? (
            <div className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-bold text-neo-navy shadow-hard-sm">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              {t('wordTower.hud.best', { m: bestM.toFixed(1) })}
            </div>
          ) : null}
          <div
            className="flex items-center gap-1 rounded-neo border-neo border-neo-cream/40 bg-neo-navy/85 px-2 py-0.5 font-neo-display text-xs font-bold text-neo-cream"
            aria-label={`${t('wordTower.hud.scramble')} ${scrambles}`}
          >
            <Shuffle className="h-3.5 w-3.5" aria-hidden />
            {scrambles}
          </div>
          {balls !== undefined ? (
            <div
              key={`balls-${balls}`}
              className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-pink px-2 py-0.5 font-neo-display text-xs font-bold text-neo-navy shadow-hard-sm animate-neo-pop"
              aria-label={t('wordTowerV2.wreck.balls', { n: balls })}
            >
              <Hammer className="h-3.5 w-3.5" aria-hidden />
              {balls}
            </div>
          ) : null}
          {tenants ? (
            <div
              key={`tenants-${tenants}`}
              className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-lime px-2 py-0.5 font-neo-display text-xs font-bold text-neo-navy shadow-hard-sm animate-neo-pop"
              aria-label={t('wordTowerV2.tenants', { n: tenants })}
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              {tenants}
            </div>
          ) : null}
        </div>
      </div>

      {combo >= 2 ? (
        <div
          key={combo}
          className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-orange px-3 py-1 font-neo-display text-lg font-black text-neo-navy shadow-hard animate-neo-pop"
          aria-label={t('wordTower.a11y.combo', { n: combo })}
        >
          <Flame className="h-5 w-5" aria-hidden />×{combo}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-[13%] z-20 flex flex-col items-center gap-1.5">
        {verdict ? (
          <div
            key={verdict.key}
            className={`rounded-neo border-neo-thick border-black px-5 py-1.5 font-neo-display text-3xl font-black uppercase shadow-hard-lg animate-neo-pop ${VERDICT_CLASS[verdict.quality]}`}
          >
            {t(`wordTower.crane.${verdict.quality}`)}
            {verdict.points > 0 ? <span className="ms-2 text-xl tabular-nums">+{verdict.points}</span> : null}
          </div>
        ) : null}

        {pop ? (
          <div
            key={pop.key}
            className="flex flex-col items-center rounded-neo border-neo-thick border-black bg-neo-yellow px-5 py-2 text-neo-navy shadow-hard-lg animate-neo-pop"
          >
            <span className="font-neo-display text-2xl font-black">
              <span aria-hidden className="me-1.5">{TOWER_SURPRISE_META[pop.event].emoji}</span>
              {t(`wordTower.surprise.${TOWER_SURPRISE_META[pop.event].key}`)}
            </span>
            <span className="font-neo-display text-sm font-bold tabular-nums">
              {[
                pop.points > 0 ? `+${pop.points}` : null,
                pop.scrambles > 0 ? t('wordTowerV2.plusScramble', { n: pop.scrambles }) : null,
                pop.widthMult > 1 ? t('wordTowerV2.wider', { n: pop.widthMult }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        ) : null}

        {zoneShown ? (
          <div
            key={zoneShown.key}
            className="flex flex-col items-center rounded-neo border-neo-thick border-black bg-neo-cyan px-5 py-1.5 text-neo-navy shadow-hard-lg animate-neo-pop"
          >
            <span className="font-neo-display text-xs font-bold uppercase tracking-widest">{t('wordTower.zone.entered')}</span>
            <span className="font-neo-display text-2xl font-black">{t(`wordTower.biome.${zoneShown.id}`)}</span>
          </div>
        ) : null}

        {bestShown ? (
          <div
            key={bestShown.key}
            className="flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow px-5 py-1.5 font-neo-display text-2xl font-black text-neo-navy shadow-hard-lg animate-neo-pop"
          >
            <Trophy className="h-6 w-6" aria-hidden />
            {t('wordTowerV2.newBest')}
          </div>
        ) : null}
      </div>
    </>
  );
}

export function V2GameOver({
  t, peakM, score, bestM, bestCombo, isBest, onRestart, smashLabel, onSmash, onShare,
}: {
  t: T; peakM: number; score: number; bestM: number; bestCombo: number; isBest: boolean; onRestart: () => void;
  /** Smash round entry, when there is a tower to wreck. */
  smashLabel?: string;
  onSmash?: () => void;
  /** Send your tower to a friend. */
  onShare?: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-neo-navy/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg animate-neo-pop">
        <h2 className="font-neo-display text-3xl font-black uppercase">{t('wordTowerV2.collapsed')}</h2>
        {isBest ? (
          <div className="mx-auto mt-2 flex w-fit items-center gap-1 rounded-neo border-neo border-black bg-neo-yellow px-3 py-0.5 font-neo-display text-sm font-bold">
            <Trophy className="h-4 w-4" aria-hidden />
            {t('wordTowerV2.newBest')}
          </div>
        ) : null}
        <div className="mt-4 font-neo-display text-6xl font-black tabular-nums">
          {peakM.toFixed(1)}
          <span className="ms-0.5 text-2xl">{t('wordTowerV2.unitM')}</span>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 font-neo-display">
          <div className="rounded-neo border-neo border-black bg-neo-lime p-2">
            <dt className="text-[11px] font-bold uppercase">{t('common.score')}</dt>
            <dd className="text-lg font-black tabular-nums">{score.toLocaleString()}</dd>
          </div>
          <div className="rounded-neo border-neo border-black bg-neo-orange p-2">
            <dt className="text-[11px] font-bold uppercase">{t('wordTower.crane.steady')}</dt>
            <dd className="text-lg font-black tabular-nums">×{bestCombo}</dd>
          </div>
          <div className="rounded-neo border-neo border-black bg-neo-yellow p-2">
            <dt className="text-[11px] font-bold uppercase">
              <Trophy className="mx-auto h-3.5 w-3.5" aria-hidden />
            </dt>
            <dd className="text-lg font-black tabular-nums">
              {bestM.toFixed(1)}
              {t('wordTowerV2.unitM')}
            </dd>
          </div>
        </dl>
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
      </div>
    </div>
  );
}
