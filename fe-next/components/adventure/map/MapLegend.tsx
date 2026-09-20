'use client';

/**
 * The node legend — pinned in Slay the Spire, a bottom sheet here because a
 * 390px phone cannot spare a column. Closed by default, one tap away, and it
 * states the elite wager the way the bar does (beat it, get a relic).
 */
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import MapLegendList from './MapLegendList';

interface Props {
  open: boolean;
  onClose: () => void;
}

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
            className="w-full rounded-t-2xl border-t-[3px] border-black bg-[#151f45] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            initial={reduce ? false : { y: 40 }} animate={{ y: 0 }} exit={reduce ? undefined : { y: 40 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-neo-display text-lg font-bold">{t('adventurePlay.map.legend')}</h2>
              <button type="button" onClick={onClose} aria-label={t('adventurePlay.map.legendClose')}
                className="rounded-lg border-[3px] border-black bg-neo-cream p-1.5 text-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3">
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
