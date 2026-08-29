'use client';

import React from 'react';
import { SilentVideo } from '@/components/ui/SilentVideo';

interface QuickPlaySeekingOverlayProps {
  t: (key: string) => string;
  /**
   * Back out to the lobby. This overlay replaces the ENTIRE lobby while a Quick
   * Play join is in flight, so without an exit the only ways out are the 10s
   * safety timeout or closing the tab — on a surface players already rage-tap.
   * Omitted when the caller has nothing to return to.
   */
  onCancel?: () => void;
}

export function QuickPlaySeekingOverlay({ t, onCancel }: QuickPlaySeekingOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/90"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <SilentVideo
          src="/mascot/spectating.webp"
          width={80}
          height={80}
          className="drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
          preload="metadata"
          aria-hidden="true"
        />
        <p className="font-neo-display text-2xl text-neo-lime">
          {t('quickPlay.seekingMatch')}
        </p>
        <p className="font-neo-body text-sm text-neo-white/70">
          {t('quickPlay.seekingMatchSub')}
        </p>
        <div
          className="w-8 h-8 rounded-full border-4 border-neo-lime/30 border-t-neo-lime animate-spin"
          aria-hidden="true"
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            data-testid="quickplay-seeking-cancel"
            className="mt-2 font-neo-body text-sm font-bold text-neo-white/70 underline
                       underline-offset-4 transition-colors hover:text-neo-white
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-neo-lime focus-visible:ring-offset-2
                       focus-visible:ring-offset-neo-navy rounded-sm px-2 py-1"
          >
            {t('quickPlay.browseInstead')}
          </button>
        )}
      </div>
    </div>
  );
}
