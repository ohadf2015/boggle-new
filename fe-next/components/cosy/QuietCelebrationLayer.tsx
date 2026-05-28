'use client';

/**
 * QuietCelebrationLayer — the calm-mode replacement for confetti / fireworks.
 *
 * In Cosy / Calm Mode the confetti chokepoint suppresses every particle burst
 * and instead dispatches `QUIET_FEEDBACK_EVENT`. This single mounted layer
 * listens for it and renders a dignified acknowledgement: a soft checkmark that
 * scales in and fades, with a quiet "Well done". No particles, no screen-shake,
 * no sound — but the moment still reads as *earned*, which matters for the
 * elder / effect-averse persona this mode is for.
 *
 * Mounted once (essential providers). Idle until calm mode fires an event, so
 * it costs nothing for the loud default.
 */

import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  QUIET_FEEDBACK_EVENT,
  shouldShowQuietFeedback,
  type QuietFeedbackDetail,
} from '@/lib/cosy/quietFeedback';

/** How long the acknowledgement stays on screen before it fades out. */
const DWELL_MS = 1400;

export const QuietCelebrationLayer: React.FC = () => {
  const { t } = useLanguage();
  const [beatId, setBeatId] = useState<number | null>(null);
  const lastShownRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onQuiet = (_e: Event) => {
      const now = Date.now();
      // Collapse a burst loop (fireworks, layered celebration) into one beat.
      if (!shouldShowQuietFeedback(lastShownRef.current, now)) return;
      lastShownRef.current = now;
      setBeatId(now);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => setBeatId(null), DWELL_MS);
    };

    window.addEventListener(QUIET_FEEDBACK_EVENT, onQuiet as EventListener);
    return () => {
      window.removeEventListener(QUIET_FEEDBACK_EVENT, onQuiet as EventListener);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (beatId === null) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9000] flex items-center justify-center"
      aria-hidden={false}
    >
      <div
        key={beatId}
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-neo-lg border border-border bg-neo-cream px-7 py-6 text-neo-black shadow-md animate-cosy-quiet-in motion-reduce:animate-none"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neo-lime-muted text-neo-black">
          <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span className="font-neo-display text-lg">{t('cosy.wellDone')}</span>
      </div>
    </div>
  );
};

export default QuietCelebrationLayer;
