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
import { selectCalmAffirmationKey } from '@/lib/cosy/calmAffirmations';

/** How long the acknowledgement stays on screen before it fades out. */
const DWELL_MS = 1400;

export const QuietCelebrationLayer: React.FC = () => {
  const { t } = useLanguage();
  const [beatId, setBeatId] = useState<number | null>(null);
  const [affirmKey, setAffirmKey] = useState<string>('cosy.wellDone');
  const lastShownRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onQuiet = (_e: Event) => {
      const now = Date.now();
      // Collapse a burst loop (fireworks, layered celebration) into one beat.
      if (!shouldShowQuietFeedback(lastShownRef.current, now)) return;
      lastShownRef.current = now;
      // Rotate the warm phrase so the calm cue varies session to session
      // instead of repeating one flat line. Deterministic, no Math.random.
      setAffirmKey(selectCalmAffirmationKey(beatCountRef.current));
      beatCountRef.current += 1;
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
        <span className="relative flex h-14 w-14 items-center justify-center">
          {/* One-shot warm bloom — a soft peach halo that fades in and out once
              across the dwell. No loop (would be a vestibular trigger for the
              effect-averse audience); hidden entirely under reduced-motion. */}
          <span
            aria-hidden="true"
            className="absolute inset-[-45%] rounded-full bg-neo-cozy-light/40 animate-cosy-bloom motion-reduce:hidden"
          />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-neo-cozy-light text-neo-black">
            <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
          </span>
        </span>
        <span className="font-neo-display text-lg">{t(affirmKey)}</span>
      </div>
    </div>
  );
};

export default QuietCelebrationLayer;
