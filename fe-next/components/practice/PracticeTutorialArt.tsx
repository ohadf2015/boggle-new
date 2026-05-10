'use client';

import React from 'react';
import Image from 'next/image';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  idx: number;
}

const MODE_SLUG: Record<PracticeMode, string> = {
  classic: 'classic',
  wordHunt: 'wordhunt',
  wheelRush: 'wheelrush',
};

/**
 * Per-slide tutorial illustration. Resolves to a language-neutral raster
 * image (no text in the image) so a single asset works across all 5 locales.
 * The slide caption next to it (rendered in PracticeTutorialSheet) carries
 * the localized tip text via t().
 *
 * Decorative — `aria-hidden` because the caption announces the tip to AT.
 */
const PracticeTutorialArt: React.FC<Props> = ({ mode, idx }) => {
  const safeIdx = Math.max(0, Math.min(2, idx)) as 0 | 1 | 2;
  const src = `/practice/tutorial/practice-tutorial-${MODE_SLUG[mode]}-${safeIdx + 1}.jpg`;
  return (
    <div
      data-testid={`practice-tutorial-art-${mode}-${safeIdx}`}
      aria-hidden="true"
      className="absolute inset-0 bg-neo-navy"
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="(min-width: 768px) 640px, 100vw"
        className="object-cover"
        priority={safeIdx === 0}
        draggable={false}
      />
    </div>
  );
};

export default PracticeTutorialArt;
