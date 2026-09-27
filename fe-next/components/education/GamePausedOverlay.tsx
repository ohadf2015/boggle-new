'use client';

import { Pause } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface GamePausedOverlayProps {
  /** Host sees "tap Resume" guidance; students see "paused by your teacher". */
  isHost?: boolean;
}

/**
 * Full-screen calm card shown to everyone while the teacher has the round
 * paused. Covers the board (pointer-events) so nothing underneath can be
 * tapped, and is announced (`role="status"`) so screen-reader students hear
 * the pause instead of wondering why the board stopped responding.
 *
 * Dark-only surface → hard-coded `bg-neo-navy` (no cream/dark pair; pitfall 5).
 */
export function GamePausedOverlay({ isHost = false }: GamePausedOverlayProps) {
  const { t, language } = useLanguage();
  const isRtl = language === 'he';

  return (
    <div
      role="status"
      aria-live="polite"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="game-paused-overlay"
      className={cn(
        // Below TeacherLiveControls (z-[70]) so the host can still hit Resume.
        'fixed inset-0 z-[60] flex items-center justify-center p-6',
        'pointer-events-auto bg-neo-navy/90',
      )}
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-neo border-3 border-black bg-neo-cream p-6 text-center text-black shadow-hard-lg',
        )}
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-3 border-black bg-neo-cyan shadow-hard">
          <Pause className="h-8 w-8" aria-hidden="true" />
        </div>
        <h2 className="font-neo-display text-2xl font-bold">{t('education.liveControls.pausedTitle')}</h2>
        <p className="mt-2 font-neo-body text-base">
          {isHost ? t('education.liveControls.pausedBodyHost') : t('education.liveControls.pausedBody')}
        </p>
      </div>
    </div>
  );
}

export default GamePausedOverlay;
