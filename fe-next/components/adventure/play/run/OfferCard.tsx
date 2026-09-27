'use client';

/** One draft card: rarity frame, art, name, one-line effect. Lifts when selected. */
import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart, Link2 } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { OfferItem } from '@/lib/adventure/play/runToken';
import { offerRarity } from './relicTriggers';
import type { OfferValue } from './offerValue';
import { COIN_ART, RARITY_FRAME, potionArt, relicArt } from './art';
import { cn } from '@/lib/utils';

export function useOfferText() {
  const { t } = useLanguageSafe();
  return (o: OfferItem): { name: string; desc: string; kind: string } => {
    if (o.type === 'relic') return { name: t(`adventurePlay.relic.${o.id}`), desc: t(`adventurePlay.relicDesc.${o.id}`), kind: t('adventurePlay.loot.kindRelic') };
    if (o.type === 'potion') return { name: t(`adventurePlay.potion.${o.id}`), desc: t(`adventurePlay.potionDesc.${o.id}`), kind: t('adventurePlay.loot.kindPotion') };
    if (o.type === 'heal') return { name: t('adventurePlay.offerHeal', { amount: o.amount }), desc: t('adventurePlay.loot.healDesc'), kind: t('adventurePlay.loot.kindHeal') };
    return { name: t('adventurePlay.offerGold', { amount: o.amount }), desc: t('adventurePlay.loot.goldDesc'), kind: t('adventurePlay.loot.kindGold') };
  };
}

export function OfferArt({ item, className }: { item: OfferItem; className?: string }) {
  if (item.type === 'heal') {
    return <span className={cn('grid place-items-center', className)}><Heart className="h-[70%] w-[70%] fill-neo-pink stroke-black stroke-[2.5]" /></span>;
  }
  const src = item.type === 'relic' ? relicArt(item.id) : item.type === 'potion' ? potionArt(item.id) : COIN_ART;
  // eslint-disable-next-line @next/next/no-img-element -- small static art
  return <img src={src} alt="" draggable={false} className={cn('object-contain drop-shadow-[2px_3px_0_rgba(0,0,0,0.55)]', className)} />;
}

interface Props {
  item: OfferItem;
  index: number;
  selected: boolean;
  dimmed: boolean;
  compact: boolean;
  /** The art is mid-flight to the relic bar. */
  artHidden?: boolean;
  /** Live value of this card for the current run (Balatro's "Currently +104"). */
  value?: OfferValue | null;
  onSelect: () => void;
}

/** The live number ("+38" / "2 → 3") with its caption — printed on the card itself. */
export function ValueChip({ value, compact, detail }: { value: OfferValue; compact?: boolean; detail?: boolean }) {
  const { t } = useLanguageSafe();
  const scoring = value.key === 'ptsPerLevel' || value.key === 'timePts';
  const dead = value.key === 'noData' || value.key === 'heartsFull' || (scoring && value.params.n === 0);
  // Stacked: the same relic alone vs on top of what the run owns ("+26 → +38").
  const stacked = scoring && value.synergy && typeof value.params.alone === 'number';
  return (
    <span data-testid="offer-value"
      className={cn('mt-1.5 block w-full rounded-lg border-2 border-black px-1 pb-1 pt-0.5 text-center shadow-[2px_2px_0_#000]', dead ? 'bg-white/15 text-neo-cream' : 'bg-neo-lime text-black')}>
      <span className="block text-[9px] font-black uppercase leading-tight tracking-wider opacity-70">{t('adventurePlay.loot.value.label')}</span>
      {/* A "45 → 75" swap is twice as wide as "+50": step it down so it never clips at 3-up on a phone. */}
      <span dir="ltr" className={cn('block whitespace-nowrap font-neo-display font-bold leading-none tabular-nums',
        value.big.length > 5 ? (compact ? 'text-sm' : 'text-base') : compact ? 'text-xl' : 'text-2xl')}>
        {value.big}
      </span>
      <span className="block text-[10px] font-extrabold leading-tight">{t(`adventurePlay.loot.value.${value.key}`, value.params)}</span>
      {stacked && (
        <span data-testid="offer-stack" className="mt-0.5 block rounded-md border-2 border-black bg-neo-yellow px-0.5 text-[9px] font-black leading-tight">
          {/* Reads in the caption's direction: alone first, stacked second (arrow flips in RTL). */}
          <span className="block whitespace-nowrap font-neo-display text-[11px] tabular-nums">
            <bdi dir="ltr" className="line-through decoration-2 opacity-60">+{value.params.alone}</bdi>
            <span aria-hidden className="mx-0.5 inline-block rtl:rotate-180">→</span>
            <bdi dir="ltr">+{value.params.n}</bdi>
          </span>
          <span className="block">{t('adventurePlay.loot.value.stackLine')}</span>
        </span>
      )}
      {value.key === 'ptsPerLevel' && value.params.total > 0 && (detail || !stacked) && (
        <span className="mt-0.5 block text-[9px] font-bold leading-tight opacity-75">{t('adventurePlay.loot.value.hitsLine', value.params)}</span>
      )}
    </span>
  );
}

const OfferCard = forwardRef<HTMLSpanElement, Props>(function OfferCard({ item, index, selected, dimmed, compact, artHidden, value, onSelect }, artRef) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const text = useOfferText()(item);
  const rarity = offerRarity(item);
  const frame = RARITY_FRAME[rarity];
  return (
    <motion.button
      type="button"
      data-testid={`draft-card-${index}`}
      aria-pressed={selected}
      onClick={onSelect}
      initial={reduce ? false : { y: 160, rotateY: 180, opacity: 0 }}
      animate={{ y: selected ? -14 : 0, rotateY: 0, opacity: dimmed ? 0.55 : 1, scale: selected ? 1.05 : 1 }}
      whileHover={reduce || selected ? undefined : { y: -6, rotate: index % 2 ? 1.5 : -1.5 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22, delay: reduce ? 0 : selected || dimmed ? 0 : 0.1 + index * 0.12 }}
      style={{ transformPerspective: 800, boxShadow: selected ? `6px 6px 0 #000, 0 0 28px 6px ${frame.glow}` : '5px 5px 0 #000' }}
      className={cn('relative flex min-w-0 flex-col overflow-hidden rounded-2xl border-[3px] border-black text-start text-neo-cream', frame.bg)}
    >
      <span className="flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-black">
        <span className="truncate">{text.kind}</span>
        <span className="shrink-0">{t(`adventurePlay.loot.rarity.${rarity}`)}</span>
      </span>
      <span className="mx-1 mb-1 flex flex-1 flex-col items-center rounded-xl border-[3px] border-black bg-[#0f1b3d] px-1.5 pb-2 pt-2">
        <span ref={artRef} className={cn('relative grid place-items-center', compact ? 'h-20 w-20' : 'h-28 w-28')}>
          <span aria-hidden className="absolute inset-1 rounded-full opacity-70 blur-md" style={{ background: frame.glow }} />
          <OfferArt item={item} className={cn('relative h-full w-full', artHidden && 'opacity-0')} />
          {value?.synergy && (
            <span className="absolute -bottom-1 start-1/2 inline-flex whitespace-nowrap -translate-x-1/2 rtl:translate-x-1/2 items-center gap-0.5 rounded-md border-2 border-black bg-neo-yellow px-1 text-[9px] font-black uppercase text-black shadow-[2px_2px_0_#000]">
              <Link2 className="h-3 w-3" />{t('adventurePlay.loot.value.synergy')}
            </span>
          )}
        </span>
        <span className={cn('mt-1 w-full text-center font-neo-display font-bold leading-tight', compact ? 'text-base' : 'text-base')}>{text.name}</span>
        <span className={cn('mt-0.5 w-full text-center text-xs font-semibold leading-snug opacity-85', compact && value ? 'line-clamp-2' : 'line-clamp-3')}>{text.desc}</span>
        {value && <ValueChip value={value} compact={compact} />}
      </span>
    </motion.button>
  );
});

export default OfferCard;
