'use client';

/**
 * The open chest's lid: every prize it holds, side by side, as a pick-ONE.
 *
 * A chest that hands you a thing and asks you to acknowledge it is a
 * confirmation, not a node. Here the cost of a pick is the rest of the shelf,
 * so the alternatives stay on screen after the pick too — tagged "Passed" —
 * and the row that was taken wears its "yours" line. Nothing is ever granted
 * before the player answers.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { RELICS } from '@/lib/adventure/play/relics';
import type { TreasureOffer } from '@/lib/adventure/play/nodeResolve';
import { COIN_ART, RARITY_FRAME, relicArt } from '../run/art';
import { relicDescKey, relicNameKey } from './nodeText';
import { cn } from '@/lib/utils';

interface Props {
  offers: TreasureOffer[];
  /** The index the run answered with; `offers.length` = the chest was left sealed. */
  taken?: number;
  busy: boolean;
  onPick: (index: number) => void;
}

/** Rarity drives the frame; gold always reads as the epic-gold pile it is. */
const frameOf = (offer: TreasureOffer) => RARITY_FRAME[offer.kind === 'relic' ? RELICS[offer.id].rarity : 'epic'];

export function offerName(offer: TreasureOffer) {
  return offer.kind === 'relic'
    ? { key: relicNameKey(offer.id), params: undefined }
    : { key: 'adventurePlay.map.outGold', params: { amount: offer.amount } };
}

export default function TreasureOffers({ offers, taken, busy, onPick }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const answered = taken != null;

  return (
    <ul data-testid="treasure-offers" className="space-y-2 pb-2">
      {offers.map((offer, i) => {
        const frame = frameOf(offer);
        const mine = taken === i;
        const passed = answered && !mine;
        const name = offerName(offer);
        const kindKey = offer.kind === 'relic' ? 'adventurePlay.loot.kindRelic' : 'adventurePlay.loot.kindGold';
        const descKey = offer.kind === 'relic' ? relicDescKey(offer.id) : 'adventurePlay.loot.goldDesc';
        return (
          <li key={`${offer.kind}-${i}`}>
            <motion.button
              type="button"
              data-testid={`treasure-offer-${i}`}
              data-state={mine ? 'taken' : passed ? 'passed' : 'open'}
              disabled={answered || busy}
              onClick={() => onPick(i)}
              aria-label={`${t(name.key, name.params)} — ${t(descKey)}`}
              initial={reduce ? false : { x: -28, opacity: 0 }}
              /* The fade of a passed prize rides in `animate`: motion writes `opacity`
                 inline on this element, so an `opacity-*` class here never lands. */
              animate={{ x: 0, opacity: passed ? 0.45 : 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 24, delay: reduce ? 0 : 0.08 + 0.07 * i }}
              whileTap={!answered && !reduce ? { scale: 0.97 } : undefined}
              className={cn(
                'relative flex w-full items-center gap-2.5 rounded-2xl border-[3px] border-black bg-[#121d42] p-2 text-start shadow-[4px_4px_0_#000] transition disabled:cursor-default',
                mine && 'bg-[#1b2f5e] ring-4 ring-neo-lime',
                passed && 'grayscale',
              )}
            >
              <span className="relative grid h-14 w-14 shrink-0 place-items-center">
                <span aria-hidden className="absolute inset-1 rounded-full opacity-70 blur-md" style={{ background: frame.glow }} />
                {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
                <img src={offer.kind === 'relic' ? relicArt(offer.id) : COIN_ART} alt="" draggable={false}
                  className="relative h-full w-full object-contain drop-shadow-[2px_3px_0_rgba(0,0,0,0.55)]" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className={cn('rounded-md border-2 border-black px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-black', frame.bg)}>
                    {offer.kind === 'relic' ? t(`adventurePlay.loot.rarity.${RELICS[offer.id].rarity}`) : t(kindKey)}
                  </span>
                  <span className="truncate font-neo-display text-[15px] font-bold leading-tight">
                    <bdi>{t(name.key, name.params)}</bdi>
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] font-semibold leading-snug opacity-85">{t(descKey)}</span>
              </span>

              {mine ? (
                <span data-testid="treasure-taken-tag" className="shrink-0 rounded-lg border-[3px] border-black bg-neo-lime px-1.5 py-1 text-black shadow-[2px_2px_0_#000]">
                  <Check className="h-5 w-5 stroke-[3]" aria-hidden />
                  {/* A gold pile does not join the relics — name what THIS row paid. */}
                  <span className="sr-only">
                    {offer.kind === 'relic' ? t('adventurePlay.node.relicAdded') : t(name.key, name.params)}
                  </span>
                </span>
              ) : passed ? (
                <span className="shrink-0 rounded-lg border-2 border-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-[10px] font-black uppercase text-black">
                  {t('adventurePlay.node.chestPassed')}
                </span>
              ) : (
                <span className="shrink-0 rounded-lg border-[3px] border-black bg-neo-yellow px-2 py-1 font-neo-display text-[13px] font-bold text-black shadow-[2px_2px_0_#000]">
                  {t('adventurePlay.loot.take')}
                </span>
              )}
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}
