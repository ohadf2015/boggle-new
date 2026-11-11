'use client';

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import type { Socket } from 'socket.io-client';
import { cn } from '@/lib/utils';
import { REACTIONS } from '@/components/game/QuickReactions';
import { useQuickReactions } from '@/hooks/useQuickReactions';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { BURST_COLORS } from '@/components/education/economy/cashBurst';
import { useLastLessonClaim, useLessonClaims } from './useLessonClaims';

export const CLAIM_TOAST_MS = 3500;
const TOAST_REACTIONS = REACTIONS.slice(0, 3);
const SHOWN_INCOMING = 5;
const BURST_PIECES = Array.from({ length: 14 }, (_, i) => ({
  x: (i % 2 ? 1 : -1) * (24 + ((i * 37) % 150)),
  y: -18 - ((i * 23) % 46),
  color: BURST_COLORS[i % BURST_COLORS.length],
}));

export interface LessonClaimToastProps {
  socket: Socket | null;
  me: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

/**
 * Claim moments: a full-width burst for the claimer, a toast with three fixed emotes for everyone else.
 * Both slide in right under the HUD bar (over the roster strip), never over rank, timer or the grid;
 * only the emote buttons take touches.
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
  const { playRareWordSound } = useSoundEffects();

  useEffect(() => {
    if (!claim || claim.seq <= seenAtMount.current) return undefined;
    baseline.current = reactionsRef.current.length;
    setShownSeq(claim.seq);
    if (claim.username.toLowerCase() === me.toLowerCase()) playRareWordSound();
    const timer = window.setTimeout(() => {
      setShownSeq(null);
      for (const r of reactionsRef.current) dismissReaction(r.id);
    }, CLAIM_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [claim, dismissReaction, me, playRareWordSound]);

  if (!race || !claim || shownSeq !== claim.seq) return null;

  const mine = claim.username.toLowerCase() === me.toLowerCase();
  const incoming = floatingReactions.slice(baseline.current).slice(-SHOWN_INCOMING);
  const enter = reduced ? false : { y: -16, scale: 0.92 };

  return (
    <div dir={dir} className="pointer-events-none fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-50 flex justify-center px-2 lg:top-[5.5rem]">
      {mine ? (
        <m.div
          key={claim.seq}
          data-testid="lesson-claim-burst"
          role="status"
          initial={reduced ? false : { y: -24, scaleX: 0.6 }}
          animate={{ y: 0, scaleX: 1 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 16 }}
          className="relative w-full max-w-xl rounded-neo border-4 border-neo-black bg-neo-lime px-3 py-2 text-center text-neo-black shadow-hard-lg"
        >
          {!reduced && (
            <span aria-hidden="true" className="pointer-events-none absolute start-1/2 top-1/2 size-0">
              {BURST_PIECES.map((p, i) => (
                <m.span
                  key={i}
                  data-testid="claim-burst-piece"
                  className="absolute size-2.5 rounded-sm border border-neo-black"
                  style={{ background: p.color }}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ x: p.x, y: p.y, opacity: 0, rotate: 180 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              ))}
            </span>
          )}
          <span data-testid="lesson-claim-burst-text" className="block font-neo-display text-2xl font-black uppercase leading-tight [overflow-wrap:anywhere]">
            {t('education.race.youClaimed', { word: claim.word, bonus: claim.bonus })}
          </span>
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
