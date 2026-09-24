'use client';

/**
 * "How a run works" + the node legend — pinned in Slay the Spire, a bottom
 * sheet here because a 390px phone cannot spare a column. It opens by itself on
 * a player's first map (runPrimer), then stays one tap away. The three steps are
 * the whole roguelike contract: climb the map, fight with words, and what
 * survives the run (relics + potions carry, half the gold banks as coins).
 */
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import MapLegendList from './MapLegendList';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRIMER = ['primerMap', 'primerFight', 'primerKeep'] as const;

export default function MapLegend({ open, onClose }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-30 flex items-end bg-black/50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-label={t('adventurePlay.map.legend')}
        >
          <motion.div
            className="max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl border-t-[3px] border-black bg-[#151f45] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            initial={reduce ? false : { y: 40 }} animate={{ y: 0 }} exit={reduce ? undefined : { y: 40 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-neo-display text-lg font-bold">{t('adventurePlay.map.primerTitle')}</h2>
              <button type="button" onClick={onClose} aria-label={t('adventurePlay.map.legendClose')}
                className="rounded-lg border-[3px] border-black bg-neo-cream p-1.5 text-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="mt-3 space-y-2">
              {PRIMER.map((key, i) => (
                <li key={key} className="flex gap-2.5 text-sm font-semibold leading-snug">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-black bg-neo-yellow font-neo-display text-xs font-black text-black" aria-hidden>
                    {i + 1}
                  </span>
                  <span>{t(`adventurePlay.map.${key}`)}</span>
                </li>
              ))}
            </ol>
            <h3 className="mt-4 font-neo-display text-sm font-bold uppercase tracking-wider opacity-80">{t('adventurePlay.map.legend')}</h3>
            <div className="mt-2">
              <MapLegendList />
            </div>
            <p className="mt-3 rounded-lg border-2 border-black bg-black/40 px-3 py-2 text-xs leading-snug">
              {t('adventurePlay.map.eliteWarning')}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
