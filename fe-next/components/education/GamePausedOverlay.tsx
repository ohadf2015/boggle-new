'use client';

import { Pause } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { EduMascot } from './EduMascot';
import { Reveal } from './motion/Reveal';

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
      <Reveal className="w-full max-w-sm">
        <div className="relative rounded-neo border-3 border-neo-black bg-neo-cream px-6 pb-6 pt-16 text-center text-neo-black shadow-hard-lg">
          <EduMascot
            moment="brainBreak"
            size={128}
            className="absolute start-1/2 top-0 size-32 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2"
          />
          <h2 className="inline-flex items-center justify-center gap-2 font-neo-display text-[clamp(1.75rem,7vw,2.75rem)] font-black leading-none">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border-[3px] border-neo-black bg-neo-cyan shadow-hard-sm">
              <Pause className="size-5" strokeWidth={3} aria-hidden="true" />
            </span>
            {t('education.liveControls.pausedTitle')}
          </h2>
          <p className="mt-3 font-neo-body text-lg font-semibold">
            {isHost ? t('education.liveControls.pausedBodyHost') : t('education.liveControls.pausedBody')}
          </p>
        </div>
      </Reveal>
    </div>
  );
}

export default GamePausedOverlay;
