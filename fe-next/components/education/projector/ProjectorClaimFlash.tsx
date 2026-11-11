'use client';

import { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Target } from 'lucide-react';
import { useLastLessonClaim } from '@/components/education/live/useLessonClaims';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

export const CLAIM_FLASH_MS = 1400;

type Claim = NonNullable<ReturnType<typeof useLastLessonClaim>>;

interface ProjectorClaimFlashProps {
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** A band across the whole wall naming the word and who grabbed it; the race tile flips underneath. */
export function ProjectorClaimFlash({ t }: ProjectorClaimFlashProps) {
  const last = useLastLessonClaim();
  const reduced = useEduReducedMotion();
  const seenSeq = useRef(last?.seq ?? 0);
  const [shown, setShown] = useState<Claim | null>(null);

  useEffect(() => {
    if (!last || last.seq <= seenSeq.current) return undefined;
    seenSeq.current = last.seq;
    if (reduced) return undefined;
    setShown(last);
    const id = window.setTimeout(() => setShown(null), CLAIM_FLASH_MS);
    return () => window.clearTimeout(id);
  }, [last, reduced]);

  if (!shown || reduced) return null;
  const letters = Array.from(shown.word.toLocaleUpperCase());

  return (
    <div
      data-testid="projector-claim-flash"
      role="status"
      aria-label={t('education.race.claimedBy', { name: shown.username, word: shown.word })}
      className="pointer-events-none fixed inset-0 z-[70] grid place-items-center border-[12px] border-neo-lime [container-type:size] max-md:hidden"
    >
      <m.div
        key={shown.seq}
        initial={{ scaleY: 0, rotate: -2 }}
        animate={{ scaleY: 1, rotate: -2 }}
        transition={{ type: 'spring', stiffness: 520, damping: 22 }}
        className="flex w-[110%] flex-col items-center gap-[2cqh] border-y-[6px] border-neo-black bg-neo-lime py-[3cqh] text-neo-black shadow-hard-xl"
      >
        <span className="flex items-center gap-[0.4em] font-neo-display font-black uppercase tracking-wide text-[clamp(18px,3.2cqh,44px)]">
          <Target className="size-[1em] shrink-0" aria-hidden />
          {t('education.race.projectorTitle')}
        </span>
        <span dir="auto" aria-hidden className="flex max-w-[90cqw] flex-wrap justify-center gap-[0.12em] text-[clamp(36px,min(12cqh,8cqw),160px)]">
          {letters.map((letter, i) => (
            <m.span
              key={i}
              initial={{ rotateX: -90 }}
              animate={{ rotateX: 0 }}
              transition={{ delay: 0.08 + i * 0.04, type: 'spring', stiffness: 380, damping: 18 }}
              className="grid min-w-[0.9em] place-items-center rounded-[0.12em] border-[0.05em] border-neo-black bg-neo-cream px-[0.08em] font-neo-display font-black leading-none shadow-hard"
            >
              {letter}
            </m.span>
          ))}
        </span>
        <span className="flex max-w-[90cqw] items-center gap-[0.4em] font-neo-display font-black text-[clamp(22px,min(6cqh,5cqw),84px)] leading-tight">
          {shown.avatar?.emoji && <span aria-hidden>{shown.avatar.emoji}</span>}
          <bdi className="text-center [overflow-wrap:anywhere]">{shown.username}</bdi>
        </span>
      </m.div>
    </div>
  );
}

export default ProjectorClaimFlash;
