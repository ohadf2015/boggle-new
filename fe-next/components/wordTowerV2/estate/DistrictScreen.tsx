'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Coins, Swords, Wrench } from 'lucide-react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { type PlotSlot, canUpgrade, repairCost, upgradeCost } from '@/lib/wordTowerV2/estate';
import { MAX_DISTRICT, PLOT_SLOTS, districtDef } from '@/lib/wordTowerV2/estateCatalog';
import type { UseEstate } from '../useEstate';
import { BuildBurst } from './BuildBurst';
import { DistrictComplete } from './DistrictComplete';
import { PlotCard } from './PlotCard';
import { PlotPanel } from './PlotPanel';
import { ITEM, backdropFor, districtProgress, whatsNew } from './estateArt';
import { gearFromEstate } from '@/lib/wordTowerV2/gear';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  estate: UseEstate;
  onClose: () => void;
}

interface Burst {
  slot: PlotSlot;
  kind: 'build' | 'repair';
  cost: number;
  key: number;
}

/**
 * The empire screen: one district, five plots, one action. The diorama is the
 * art pack's backdrop with the five building sprites standing on its ground
 * line — one row at desktop/TV width, two rows on a phone so nothing scrolls.
 */
export function DistrictScreen({ t, estate: api, onClose }: Props) {
  const { estate, status } = api;
  const { playSound } = useSoundEffects();
  const reducedMotion = usePrefersReducedMotion();
  const [slot, setSlot] = useState<PlotSlot>('foundation');
  const [burst, setBurst] = useState<Burst | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState<number | null>(null);
  /**
   * Raids waiting when this screen opened. markSeen() empties the live inbox
   * immediately, so the "while you were away" chip has to read a snapshot or it
   * would flash and disappear before anyone could read it.
   */
  const [raidsOnOpen, setRaidsOnOpen] = useState(0);
  const burstTimer = useRef(0);
  const opened = useRef(false);

  const news = useMemo(() => whatsNew(estate, raidsOnOpen), [estate, raidsOnOpen]);

  // Land on what changed: the first thing you can act on is already selected.
  useEffect(() => {
    if (opened.current || status === 'loading') return;
    opened.current = true;
    setRaidsOnOpen(api.inbox.length);
    setSlot(news.damaged[0] ?? news.affordable[0] ?? 'foundation');
    playSound('menuOpen', { volume: 0.5 });
    void api.refresh();
    if (api.inbox.length > 0) void api.markSeen();
    // One shot on open — deliberately not re-running as the estate changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => () => window.clearTimeout(burstTimer.current), []);

  const showBurst = useCallback((next: Burst) => {
    setBurst(next);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(null), 1100);
  }, []);

  const districtName = t(`wordTowerV2.estate.district.${districtDef(estate.district).id}`);
  // Plots are tower parts now: the name is the part, the same in every district.
  const nameOf = (s: PlotSlot) => t(`wordTowerV2.gear.${s}`);
  const gear = gearFromEstate(estate);

  const act = useCallback(
    async (kind: 'build' | 'repair') => {
      if (busy) return;
      const plot = estate.plots.find((p) => p.slot === slot);
      if (!plot) return;
      const before = estate.district;
      const cost = kind === 'build' ? upgradeCost(estate.district, slot, plot.level) : repairCost(estate.district, slot, plot.level);
      setBusy(true);
      const res = kind === 'build' ? await api.upgrade(slot) : await api.repair(slot);
      setBusy(false);
      if (!res.ok) {
        playSound('wordRejected', { volume: 0.4 });
        return;
      }
      playSound(kind === 'build' ? 'upgradePurchase' : 'questComplete', { volume: 0.6 });
      playSound('coinCollect', { volume: 0.35 });
      showBurst({ slot, kind, cost, key: Date.now() });
      if (res.districtCompleted && before < MAX_DISTRICT) {
        window.setTimeout(() => {
          setCompleted(before);
          playSound('crownSparkle', { volume: 0.6 });
        }, 700);
      }
    },
    [api, busy, estate, playSound, showBurst, slot],
  );

  const progress = districtProgress(estate);
  const levels = estate.plots.reduce((sum, p) => sum + p.level, 0);
  const row = (slots: PlotSlot[], size: 'back' | 'front' | 'wide', cls: string) => (
    <div className={`flex w-full items-end justify-center gap-1.5 md:gap-6 ${cls}`}>
      {slots.map((s) => {
        const plot = estate.plots.find((p) => p.slot === s) ?? estate.plots[0];
        const check = canUpgrade(estate, s);
        return (
          <div key={s} className="relative flex-1 md:max-w-[17rem]">
            <PlotCard
              t={t}
              district={estate.district}
              plot={plot}
              material={gear[s].material}
              name={nameOf(s)}
              // A blueprint could pay for ANY plot, so the tile always quotes
              // coins; the panel is where the free build is offered.
              cost={upgradeCost(estate.district, s, plot.level)}
              affordable={check.ok}
              repairCost={estate.bricks > 0 ? 0 : repairCost(estate.district, s, plot.level)}
              selected={slot === s}
              building={burst?.slot === s}
              size={size}
              reducedMotion={reducedMotion}
              onSelect={() => {
                setSlot(s);
                playSound('buttonClick', { volume: 0.3 });
              }}
            />
            <BuildBurst
              show={burst?.slot === s}
              kind={burst?.kind ?? 'build'}
              cost={burst?.cost ?? 0}
              label={t(burst?.kind === 'repair' ? 'wordTowerV2.estate.repaired' : 'wordTowerV2.estate.built')}
              reducedMotion={reducedMotion}
              onDone={() => undefined}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-neo-navy" role="dialog" aria-modal="true" aria-label={t('wordTowerV2.estate.title')}>
      {/* `pe-14` reserves the corner the global in-game mute FAB is pinned to
          (40px + its 8px inset). Without it the coin bank sat straight under
          that FAB on a phone — on /en its last digits, on /he (where the FAB
          mirrors to the start edge) the whole pill. Same reserve V2TopBar
          makes, and it is logical-direction so one value covers both. */}
      <header className="z-10 flex items-center gap-2 border-b-4 border-black bg-neo-navy px-3 pb-2 pe-14 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => {
            playSound('menuClose', { volume: 0.5 });
            onClose();
          }}
          aria-label={t('wordTowerV2.estate.back')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          <ArrowLeft className="h-6 w-6 rtl:rotate-180" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-neo-display text-lg font-black uppercase text-neo-cream md:text-2xl">{districtName}</h2>
          <div className="mt-0.5 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-sm border-2 border-neo-cream/40 bg-neo-navy-light" role="progressbar" aria-valuemin={0} aria-valuemax={25} aria-valuenow={levels}>
              <div className="h-full bg-neo-lime transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="font-neo-display text-[11px] font-bold tabular-nums text-neo-cream/80">
              {t('wordTowerV2.estate.progress', { done: levels, total: 25 })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-yellow px-2.5 py-1 font-neo-display text-base font-black tabular-nums text-neo-navy shadow-hard md:text-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ITEM.coin} alt="" aria-hidden className="h-5 w-5 md:h-7 md:w-7" />
          {estate.coins.toLocaleString()}
        </div>
      </header>

      {news.hasNews ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5 border-b-4 border-black bg-neo-navy-light px-3 py-1.5">
          {news.raids > 0 ? (
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-pink px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy shadow-hard-sm">
              <Swords className="h-3.5 w-3.5" aria-hidden />
              {t('wordTowerV2.estate.newsRaids', { n: news.raids })}
            </span>
          ) : null}
          {news.damaged.length > 0 ? (
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-red px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy shadow-hard-sm">
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              {t('wordTowerV2.estate.newsDamaged', { n: news.damaged.length })}
            </span>
          ) : null}
          {news.affordable.length > 0 ? (
            <span className="flex items-center gap-1 rounded-neo border-neo border-black bg-neo-lime px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy shadow-hard-sm animate-neo-pop">
              <Coins className="h-3.5 w-3.5" aria-hidden />
              {t('wordTowerV2.estate.newsAffordable', { n: news.affordable.length })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="relative flex-1 overflow-hidden">
        {/* `auto 100%` keeps the skyline's proportions and tiles sideways, so a
            1920 screen gets more CITY rather than a stretched one. */}
        <div
          className="absolute inset-0 bg-bottom bg-repeat-x"
          style={{ backgroundImage: `url(${backdropFor(estate.district)})`, backgroundSize: 'auto 100%' }}
          aria-hidden
        />
        {/* The skyline is a MOOD, the five plots are the subject. Without this
            the sunset backdrop is the loudest thing on screen and both the
            buildings and the cyan plan-ghosts wash out against it. */}
        <div className="pointer-events-none absolute inset-0 bg-neo-navy/55" aria-hidden />
        {/* On a 1920 screen the backdrop's own sky reaches the header as a flat
            band; fading it into the chrome keeps the seam off the screen. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-neo-navy to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-neo-navy/90 via-neo-navy/45 to-transparent" aria-hidden />
        {/* Both phone rows sit LOW: the back row on the skyline's roofline and
            the front row on the ground band, so nothing floats in the sky. */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end px-2 pb-2">
          {row(PLOT_SLOTS.slice(0, 3), 'back', 'md:hidden')}
          {row(PLOT_SLOTS.slice(3), 'front', 'md:hidden')}
          <div className="mx-auto hidden w-full max-w-[1700px] md:block">{row([...PLOT_SLOTS], 'wide', '')}</div>
        </div>
      </div>

      <div className="border-t-4 border-black bg-neo-navy px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <PlotPanel t={t} estate={estate} slot={slot} name={nameOf(slot)} busy={busy} onUpgrade={() => void act('build')} onRepair={() => void act('repair')} />
        {!api.authed ? (
          <p className="mx-auto mt-1.5 max-w-md text-center font-neo-display text-[11px] font-bold text-neo-cream/60">{t('wordTowerV2.estate.guest')}</p>
        ) : null}
      </div>

      {completed !== null ? (
        <DistrictComplete
          t={t}
          district={completed}
          doneName={t(`wordTowerV2.estate.district.${districtDef(completed).id}`)}
          nextName={t(`wordTowerV2.estate.district.${districtDef(completed + 1).id}`)}
          reducedMotion={reducedMotion}
          onContinue={() => {
            setCompleted(null);
            setSlot('foundation');
          }}
        />
      ) : null}
    </div>
  );
}
