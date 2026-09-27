'use client';

import { X } from 'lucide-react';
import { BLAST_TILE_TYPE_LIST } from '@/shared/types/blast';
import { BLAST_RETIRED_SPECIAL_TYPES } from './utils/blastWaveConfig';
import { TILE_VISUALS } from './blastTileVisuals';

// Retired types are zeroed in every wave distribution, so listing them taught
// players tiles they can never meet — and locked/key/chocolate/cake had no
// strings at all, which is where the "Translation missing" Sentry issues came from.
const GUIDE_TILE_TYPES = BLAST_TILE_TYPE_LIST.filter(
  (type) => !BLAST_RETIRED_SPECIAL_TYPES.has(type),
);

interface BlastTileGuideProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string | undefined;
}

/**
 * BlastTileGuide — modal listing every tile type with its in-game visual.
 * Icons + gradients are pulled from TILE_VISUALS (single source of truth),
 * so adding a new tile type automatically shows up here.
 */
export function BlastTileGuide({ isOpen, onClose, t }: BlastTileGuideProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in-0 duration-200"
          onClick={onClose}
          data-testid="blast-tile-guide"
        >
          <div
            className="relative w-full max-w-sm max-h-[80vh] bg-neo-navy-light border-neo border-neo-black rounded-neo shadow-hard overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-90 duration-200"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="font-neo-display font-bold text-neo-white text-lg">
                {t('blast.tileGuide.title')}
              </h2>
              <button
                onClick={onClose}
                className="text-white hover:text-white transition-colors"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable grid */}
            <div className="overflow-y-auto overscroll-contain p-3 flex-1">
              <div className="grid grid-cols-1 gap-2">
                {GUIDE_TILE_TYPES.map((type) => {
                  const visual = TILE_VISUALS[type];
                  const Icon = visual.indicator;
                  return (
                    <div
                      key={type}
                      className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-neo px-3 py-2"
                    >
                      <span
                        className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-neo border-2 border-black/40 ${visual.text ?? ''}`}
                        style={visual.style}
                        aria-hidden="true"
                      >
                        {Icon ? <Icon className="w-5 h-5" strokeWidth={2.5} /> : null}
                      </span>
                      <div className="min-w-0">
                        <span className="block font-neo-display font-bold text-neo-white text-sm capitalize">
                          {t(`blast.tileGuide.${type}.name`)}
                        </span>
                        <span className="block font-neo-body text-white text-xs">
                          {t(`blast.tileGuide.${type}.desc`)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BlastTileGuide;
