'use client';

/**
 * Lexi on the Academy Map — the emotional layer of the hub. One mascot, one
 * short line, always agreeing with the hero button (see `academyMascotMood`):
 * celebrates a live game, panics about a dying streak, waves at a student with
 * no class yet. Purely decorative input-wise (pointer-events-none) so it never
 * eats a tap meant for an island.
 */

import { m, useReducedMotion } from 'framer-motion';
import { Mascot } from '@/components/ui/Mascot';
import { useLanguage } from '@/contexts/LanguageContext';
import type { AcademyMascotMood } from './academyMascotMood';

interface Props {
  mood: AcademyMascotMood;
  reducedMotion: boolean;
}

export function AcademyMascot({ mood, reducedMotion }: Props) {
  const { t } = useLanguage();
  const osReduced = useReducedMotion();
  const still = reducedMotion || !!osReduced;
  const line = t(mood.lineKey, mood.lineKey, mood.params);

  return (
    <m.div
      key={`${mood.variant}-${mood.lineKey}`}
      data-testid="academy-mascot"
      className="pointer-events-none flex items-end gap-1 self-start ps-1"
      initial={still ? false : { scale: 0.7, y: 10, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
    >
      {/* xs art is 100px; the negative margin pulls its footprint to ~64px so
          the bubble row stays shorter than the hero button. */}
      <span aria-hidden="true" className="-m-[18px] shrink-0">
        <Mascot variant={mood.variant} size="xs" animated={!still} clipBorder="none" />
      </span>
      <span className="relative mb-3 ms-1 max-w-[16rem] rounded-neo border-2 border-neo-black bg-neo-cream px-2.5 py-1 font-neo-display text-xs font-bold leading-snug text-neo-black shadow-hard-sm sm:text-sm">
        <span
          aria-hidden="true"
          className="absolute -bottom-[7px] start-4 h-3 w-3 rotate-45 border-b-2 border-e-2 border-neo-black bg-neo-cream"
        />
        <span dir="auto" data-testid="academy-mascot-line" aria-live="polite">
          {line}
        </span>
      </span>
    </m.div>
  );
}
