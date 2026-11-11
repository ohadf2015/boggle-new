'use client';

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import type { Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';
import { REACTIONS } from '@/components/game/QuickReactions';
import { useQuickReactions } from '@/hooks/useQuickReactions';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { useLastLessonClaim, useLessonClaims } from './useLessonClaims';

export const CLAIM_TOAST_MS = 3500;
const TOAST_REACTIONS = REACTIONS.slice(0, 3);
const SHOWN_INCOMING = 5;

export interface LessonClaimToastProps {
  socket: Socket | null;
  me: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

/**
 * Claim moments on a phone: a burst for the claimer, a toast with three fixed emotes for everyone else.
 * Pinned over the HUD and sized to its own content, so it never sits on the letter grid; only the
 * emote buttons take touches.
 */
export function LessonClaimToast({ socket, me, t, dir }: LessonClaimToastProps) {
  const race = useLessonClaims();
  const claim = useLastLessonClaim();
  const reduced = useEduReducedMotion();
  const [shownSeq, setShownSeq] = useState<number | null>(null);
  const { floatingReactions, sendReaction, dismissReaction } = useQuickReactions({ socket, username: me });
  const baseline = useRef(0);
  const seenAtMount = useRef(claim?.seq ?? 0);
  const reactionsRef = useRef(floatingReactions);
  reactionsRef.current = floatingReactions;

  useEffect(() => {
    if (!claim || claim.seq <= seenAtMount.current) return undefined;
    baseline.current = reactionsRef.current.length;
    setShownSeq(claim.seq);
    const timer = window.setTimeout(() => {
      setShownSeq(null);
      for (const r of reactionsRef.current) dismissReaction(r.id);
    }, CLAIM_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [claim, dismissReaction]);

  if (!race || !claim || shownSeq !== claim.seq) return null;

  const mine = claim.username.toLowerCase() === me.toLowerCase();
  const incoming = floatingReactions.slice(baseline.current).slice(-SHOWN_INCOMING);
  const enter = reduced ? false : { y: -16, scale: 0.92 };

  return (
    <div dir={dir} className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[calc(0.5rem+env(safe-area-inset-top))]">
      {mine ? (
        <m.div
          key={claim.seq}
          data-testid="lesson-claim-burst"
          role="status"
          initial={enter}
          animate={{ y: 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 18 }}
          className="rounded-neo border-3 border-neo-black bg-neo-lime px-4 py-2 font-neo-display text-lg font-black uppercase text-neo-black shadow-hard"
        >
          {t('education.race.youClaimed', { word: claim.word, bonus: claim.bonus })}
        </m.div>
      ) : (
        <m.div
          key={claim.seq}
          data-testid="lesson-claim-toast"
          role="status"
          initial={enter}
          animate={{ y: 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 22 }}
          className="flex min-w-0 max-w-md items-center gap-2 rounded-neo border-3 border-neo-cream/40 bg-neo-navy py-1 ps-3 pe-1 text-neo-cream shadow-hard"
        >
          {claim.avatar?.emoji && <span aria-hidden="true" className="text-xl">{claim.avatar.emoji}</span>}
          <span data-testid="lesson-claim-text" className="line-clamp-2 min-w-0 flex-1 font-neo-display text-sm font-black leading-tight [overflow-wrap:anywhere]">
            {t('education.race.claimedBy', { name: claim.username, word: claim.word })}
          </span>
          {incoming.length > 0 && (
            <span aria-hidden="true" className="flex shrink-0">
              {incoming.map((r) => <span key={r.id}>{r.emoji}</span>)}
            </span>
          )}
          <span data-testid="lesson-claim-reactions" className="pointer-events-auto flex shrink-0">
            {TOAST_REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => sendReaction(r.id)}
                aria-label={t(r.labelKey)}
                className="grid size-11 place-items-center rounded-neo text-xl active:scale-90 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
              >
                {r.emoji}
              </button>
            ))}
          </span>
        </m.div>
      )}
    </div>
  );
}

export default LessonClaimToast;
