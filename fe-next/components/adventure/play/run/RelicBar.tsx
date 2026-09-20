'use client';

/**
 * Owned relics as a strip of framed icons. Tap one for its tooltip. When a
 * word triggers relics (`pulse`), those icons flash + bounce ON the relic so
 * the player sees which passive just paid out.
 */
import { useEffect, useState, type Ref } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { RELICS, type RelicId } from '@/lib/adventure/play/relics';
import { RARITY_FRAME, relicArt } from './art';
import RelicTooltip, { type StackCtx } from './RelicTooltip';
import { cn } from '@/lib/utils';

export interface RelicPulse { id: number; relics: RelicId[]; labels?: Partial<Record<RelicId, string>> }

interface Props {
  relics: readonly RelicId[];
  pulse?: RelicPulse | null;
  /** Render an empty dashed slot at the end (draft fly-in target). */
  ghostRef?: Ref<HTMLSpanElement>;
  size?: 'sm' | 'md';
  className?: string;
  /** Each relic's running points this level — printed under its icon. */
  contrib?: Partial<Record<RelicId, number>>;
  /** Run words + owned relics, so the tooltip can show alone vs stacked values. */
  stackCtx?: StackCtx | null;
}

export default function RelicBar({ relics, pulse, ghostRef, size = 'sm', className, contrib, stackCtx }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<RelicId | null>(null);
  const box = size === 'md' ? 'h-11 w-11' : 'h-9 w-9';

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => setOpen(null), 3500);
    return () => clearTimeout(id);
  }, [open]);

  return (
    <div className={cn('relative', className)}>
      <ul className="flex items-center -mt-3 gap-1.5 overflow-x-auto pb-2 pt-4 [scrollbar-width:none]" aria-label={t('adventurePlay.loot.relicsTitle')}>
        {relics.map((id) => {
          const frame = RARITY_FRAME[RELICS[id]?.rarity ?? 'common'];
          const firing = !!pulse && pulse.relics.includes(id);
          const earned = contrib?.[id];
          return (
            <li key={id} className="relative shrink-0">
              <motion.button
                key={firing ? `${id}-${pulse!.id}` : id}
                type="button"
                data-relic={id}
                data-firing={firing || undefined}
                onClick={() => setOpen((o) => (o === id ? null : id))}
                aria-label={t(`adventurePlay.relic.${id}`)}
                aria-expanded={open === id}
                initial={false}
                animate={firing && !reduce ? { scale: [1, 1.35, 0.95, 1], rotate: [0, -8, 6, 0] } : { scale: 1 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className={cn('relative grid place-items-center rounded-lg border-[3px] border-black p-0.5 shadow-[2px_2px_0_#000]', frame.bg, box,
                  open === id && 'ring-[3px] ring-neo-cream')}
                style={firing ? { boxShadow: `0 0 0 3px #000, 0 0 18px 6px ${frame.glow}` } : undefined}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
                <img src={relicArt(id)} alt="" className="h-full w-full object-contain drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]" draggable={false} />
                {firing && (
                  <span aria-hidden className="pointer-events-none absolute -top-3 start-1/2 z-10 -translate-x-1/2 rtl:translate-x-1/2">
                    <motion.span
                      initial={{ opacity: 0, y: 4, scale: 0.6 }}
                      animate={{ opacity: [0, 1, 1, 0], y: [2, -4, -5, -7], scale: [0.6, 1.15, 1, 1] }}
                      transition={{ duration: 1.1, times: [0, 0.2, 0.7, 1] }}
                      className="block whitespace-nowrap rounded-md border-2 border-black bg-neo-lime px-1 font-neo-display text-[11px] font-bold leading-tight text-black"
                    >
                      {pulse!.labels?.[id] || <Sparkles className="h-3 w-3" />}
                    </motion.span>
                  </span>
                )}
              </motion.button>
              {!!earned && earned > 0 && (
                <span className="pointer-events-none absolute -bottom-1 start-1/2 z-10 -translate-x-1/2 rtl:translate-x-1/2">
                  <motion.span
                    key={earned}
                    data-testid={`relic-contrib-${id}`}
                    aria-label={t('adventurePlay.loot.contribAria', { name: t(`adventurePlay.relic.${id}`), n: earned })}
                    initial={reduce ? false : { scale: 1.7 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    dir="ltr"
                    className="block whitespace-nowrap rounded border-2 border-black bg-neo-lime px-0.5 font-neo-display text-[10px] font-bold leading-none tabular-nums text-black"
                  >
                    +{earned}
                  </motion.span>
                </span>
              )}
            </li>
          );
        })}
        {ghostRef && (
          <li className="shrink-0">
            <span ref={ghostRef} aria-label={t('adventurePlay.loot.emptySlot')}
              className={cn('grid place-items-center rounded-lg border-[3px] border-dashed border-neo-cream/40 bg-black/30', box)} />
          </li>
        )}
      </ul>
      <AnimatePresence>{open && <RelicTooltip key={open} id={open} onClose={() => setOpen(null)} earned={contrib?.[open]} stackCtx={stackCtx} />}</AnimatePresence>
    </div>
  );
}
