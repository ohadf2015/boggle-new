'use client';

import { X } from 'lucide-react';
import { BlastTileLegendList } from './BlastTileLegend';

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
              <BlastTileLegendList t={t} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BlastTileGuide;
