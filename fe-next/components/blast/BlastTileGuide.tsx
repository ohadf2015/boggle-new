'use client';

import { X } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import type { BlastTileType } from './types';

interface BlastTileGuideProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string | undefined;
}

/** Tile type visual config for the guide: indicator emoji + translation key */
const TILE_GUIDE_ENTRIES: Array<{ type: BlastTileType; indicator: string; key: string }> = [
  { type: 'standard', indicator: '🔤', key: 'standard' },
  { type: 'gold', indicator: '✦', key: 'gold' },
  { type: 'silver', indicator: '🥈', key: 'silver' },
  { type: 'diamond', indicator: '💠', key: 'diamond' },
  { type: 'bomb', indicator: '💣', key: 'bomb' },
  { type: 'lightning', indicator: '⚡', key: 'lightning' },
  { type: 'prism', indicator: '🔷', key: 'prism' },
  { type: 'rainbow', indicator: '🌈', key: 'rainbow' },
  { type: 'ice', indicator: '❄', key: 'ice' },
  { type: 'frozen', indicator: '🧊', key: 'frozen' },
  { type: 'gem', indicator: '💎', key: 'gem' },
  { type: 'mirror', indicator: '🪞', key: 'mirror' },
  { type: 'magnet', indicator: '🌀', key: 'magnet' },
  { type: 'wildcard', indicator: '🃏', key: 'wildcard' },
  { type: 'countdown', indicator: '⏳', key: 'countdown' },
  { type: 'virus', indicator: '🦠', key: 'virus' },
  { type: 'portal', indicator: '🌌', key: 'portal' },
  { type: 'catalyst', indicator: '⚗️', key: 'catalyst' },
];

/**
 * BlastTileGuide — modal showing all 18 tile types with descriptions.
 * Neo-brutalist styling, animated enter/exit.
 */
export function BlastTileGuide({ isOpen, onClose, t }: BlastTileGuideProps) {
  return (
    <AdaptiveAnimatePresence>
      {isOpen && (
        <AdaptiveMotion.div
          key="tile-guide-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
          data-testid="blast-tile-guide"
        >
          <AdaptiveMotion.div
            key="tile-guide-panel"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm max-h-[80vh] bg-neo-navy-light border-neo border-neo-black rounded-neo shadow-hard overflow-hidden flex flex-col"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="font-neo-display font-bold text-neo-white text-lg">
                {t('blast.tileGuide.title')}
              </h2>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable grid */}
            <div className="overflow-y-auto overscroll-contain p-3 flex-1">
              <div className="grid grid-cols-1 gap-2">
                {TILE_GUIDE_ENTRIES.map(({ type, indicator, key }) => (
                  <div
                    key={type}
                    className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-neo px-3 py-2"
                  >
                    <span className="text-xl shrink-0 w-8 text-center" aria-hidden="true">
                      {indicator}
                    </span>
                    <div className="min-w-0">
                      <span className="block font-neo-display font-bold text-neo-white text-sm capitalize">
                        {t(`blast.tileGuide.${key}.name`)}
                      </span>
                      <span className="block font-neo-body text-white/60 text-xs">
                        {t(`blast.tileGuide.${key}.desc`)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}

export default BlastTileGuide;
