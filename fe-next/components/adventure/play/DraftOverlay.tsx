'use client';

/**
 * Pick 1 of N (4 with lucky-clover) between levels — Balatro-style cards with
 * rarity frames. Tap a card to inspect, TAKE IT to claim: a relic flies into
 * the relic bar before the next board is dealt. Skip is always allowed.
 */
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { OfferItem, PublicRun } from '@/lib/adventure/play/runToken';
import type { RelicId } from '@/lib/adventure/play/relics';
import OfferCard, { OfferArt, ValueChip, useOfferText } from './run/OfferCard';
import { offerValue, runLevels } from './run/offerValue';
import { offerRarity } from './run/relicTriggers';
import { RARITY_FRAME } from './run/art';
import { readRunWords } from './runStorage';
import RelicBar, { type RelicPulse } from './run/RelicBar';
import GoldCounter from './run/GoldCounter';
import { cn } from '@/lib/utils';

interface Props {
  offer: OfferItem[];
  onPick: (index: number | null) => void;
  run?: PublicRun | null;
}

/** Kept for callers that only need the label. */
export function useOfferLabel() {
  const text = useOfferText();
  return (o: OfferItem) => { const { name, desc } = text(o); return { name, desc }; };
}

interface Flight { item: OfferItem; from: DOMRect; to: DOMRect | null }

export default function DraftOverlay({ offer, onPick, run }: Props) {
  const { t } = useLanguageSafe();
  const sfx = useSoundEffects();
  const reduce = useReducedMotion();
  const text = useOfferText();
  const [sel, setSel] = useState<number | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [owned, setOwned] = useState<RelicId[]>(run?.relics ?? []);
  const [pulse, setPulse] = useState<RelicPulse | null>(null);
  const artRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const busy = flight !== null;
  const compact = offer.length > 3;
  // Live, run-specific worth of each card (replays this run's words through the real formula).
  const levels = useMemo(() => (run ? readRunWords(run.w) : []), [run]);
  const values = useMemo(() => (run ? offer.map((o) => offerValue(o, { levels, run })) : offer.map(() => null)), [offer, run, levels]);
  // Tooltips on owned relics show alone vs stacked, from the same run words.
  const stackCtx = useMemo(() => (run ? { levels: runLevels(run.w, levels), owned } : null), [run, levels, owned]);

  const take = () => {
    if (sel == null || busy) return;
    const item = offer[sel];
    sfx.playUpgradePurchaseSound?.();
    const from = artRefs.current[sel]?.getBoundingClientRect();
    if (reduce || !from) { onPick(sel); return; }
    const to = item.type === 'relic' ? ghostRef.current?.getBoundingClientRect() ?? null : null;
    setFlight({ item, from, to });
    const land = to ? 620 : 420;
    setTimeout(() => {
      if (item.type === 'relic') {
        setOwned((o) => [...o, item.id]);
        setPulse({ id: Date.now(), relics: [item.id] });
        sfx.playPowerUpSound?.();
      }
    }, land);
    setTimeout(() => onPick(sel), land + 380);
  };

  const skip = () => {
    if (busy) return;
    sfx.playMenuCloseSound?.();
    onPick(null);
  };

  const chosen = sel != null ? offer[sel] : null;
  const chosenValue = sel != null ? values[sel] : null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="draft-title" className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[#0f1b3d] text-neo-cream">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(170,90,255,0.22)_0%,transparent_65%)]" />
      <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Run strip: relics (with the slot the pick flies into), hearts, gold */}
        <div className="flex items-center gap-2 pe-11">
          <RelicBar relics={owned} pulse={pulse} ghostRef={ghostRef} stackCtx={stackCtx} className="min-w-0 flex-1" />
          {run && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-[3px] border-black bg-black/70 px-2 py-0.5 font-neo-display text-sm font-bold tabular-nums shadow-[2px_2px_0_#000]"
              aria-label={t('adventurePlay.loot.hearts', { hp: run.hp, max: run.maxHp })}>
              <Heart className="h-4 w-4 fill-neo-pink stroke-black" /> {run.hp}/{run.maxHp}
            </span>
          )}
          {run && <GoldCounter value={run.gold} />}
        </div>

        <div className="flex flex-1 flex-col justify-center">
        <div className="text-center">
          <h2 id="draft-title" className="font-neo-display text-3xl font-bold uppercase leading-none tracking-tight">{t('adventurePlay.draftTitle')}</h2>
          <p className="mt-1.5 text-sm font-semibold opacity-80">{t('adventurePlay.draftSub')}</p>
        </div>

        <div className={cn('mt-5 grid gap-2.5', compact ? 'grid-cols-2' : 'grid-cols-3')}>
          {offer.map((o, i) => (
            <OfferCard key={`${o.type}-${i}`} ref={(el) => { artRefs.current[i] = el; }} item={o} index={i} compact={compact}
              value={values[i]} selected={sel === i} dimmed={sel != null && sel !== i} artHidden={busy && sel === i}
              onSelect={() => { if (busy) return; sfx.playButtonClickSound?.(); setSel((s) => (s === i ? null : i)); }} />
          ))}
        </div>

        {/* Detail */}
        <div className="mt-4 min-h-[5.5rem]">
          <AnimatePresence mode="wait">
            {chosen ? (
              <motion.div key={sel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                className="rounded-2xl border-[3px] border-black bg-black/50 p-3 text-center shadow-[4px_4px_0_#000]" aria-live="polite">
                <div className="flex items-center justify-center gap-2 font-neo-display text-lg font-bold">
                  {text(chosen).name}
                  <span className={cn('rounded-md border-2 border-black px-1.5 text-[10px] font-black uppercase text-black', RARITY_FRAME[offerRarity(chosen)].bg)}>
                    {t(`adventurePlay.loot.rarity.${offerRarity(chosen)}`)}
                  </span>
                </div>
                <div className="text-sm font-semibold opacity-90">{text(chosen).desc}</div>
                {chosenValue && (
                  <div className="mx-auto mt-1 max-w-[16rem]"><ValueChip value={chosenValue} detail /></div>
                )}
                {chosenValue?.synergy && (
                  <div className="mt-1 text-xs font-bold text-neo-yellow">{t('adventurePlay.loot.value.synergyHint')}</div>
                )}
              </motion.div>
            ) : (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} exit={{ opacity: 0 }} className="pt-4 text-center text-sm font-bold">
                {t('adventurePlay.loot.tapCard')}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={take} disabled={sel == null || busy} data-testid="draft-take"
            className="w-full rounded-xl border-[3px] border-black bg-neo-lime py-3 font-neo-display text-xl font-bold uppercase text-black shadow-[4px_4px_0_#000] active:translate-y-0.5 active:shadow-[1px_1px_0_#000] disabled:bg-neo-lime/40 disabled:shadow-none">
            {t('adventurePlay.loot.take')}
          </button>
          <button type="button" onClick={skip} disabled={busy} data-testid="draft-skip"
            className="mx-auto rounded-lg px-4 py-1.5 text-sm font-bold underline decoration-2 underline-offset-4 opacity-80 disabled:opacity-40">
            {t('adventurePlay.skip')}
          </button>
        </div>
      </div>

      {flight && (
        <motion.div aria-hidden className="pointer-events-none fixed z-[70]"
          style={{ left: flight.from.left, top: flight.from.top, width: flight.from.width, height: flight.from.height }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={flight.to
            ? { x: [0, (flight.to.left - flight.from.left) * 0.4, flight.to.left - flight.from.left + (flight.to.width - flight.from.width) / 2], y: [0, -90, flight.to.top - flight.from.top + (flight.to.height - flight.from.height) / 2], scale: [1, 1.5, flight.to.width / flight.from.width], rotate: [0, -20, 360] }
            : { scale: [1, 1.8, 2.4], opacity: [1, 1, 0], y: [0, -40, -60] }}
          transition={{ duration: flight.to ? 0.62 : 0.5, ease: 'easeInOut', times: [0, 0.35, 1] }}>
          <OfferArt item={flight.item} className="h-full w-full" />
        </motion.div>
      )}
    </div>
  );
}
