'use client';

import { createElement, useEffect, useState } from 'react';
import Image from 'next/image';
import { EDU_MASCOT, type EduMascotPose } from '@/lib/education/mascotArt';
import type { Language } from '@/lib/supabase/education/types';
import { loadThemedPacks, type ThemedPack } from '@/lib/education/themedPacks';
import { GRADE_BANDS, type GradeBand } from '@/lib/education/library';
import logger from '@/utils/logger';

/** null while the language's chunk is still on its way. */
export function useThemedPacks(language: Language): ThemedPack[] | null {
  const [state, setState] = useState<{ language: Language; packs: ThemedPack[] } | null>(null);
  useEffect(() => {
    let live = true;
    loadThemedPacks(language)
      .then((packs) => {
        if (live) setState({ language, packs });
      })
      .catch((error) => logger.error('Failed to load themed packs:', error));
    return () => {
      live = false;
    };
  }, [language]);
  return state?.language === language ? state.packs : null;
}

type T = (key: string, params?: Record<string, string | number>) => string;

export function gradeBandsLabel(bands: readonly GradeBand[], t: T): string {
  if (bands.length === GRADE_BANDS.length) return t('eduLibrary.grade.any');
  if (bands.length > 1 && bands[bands.length - 1] === 'g912') {
    return t('education.starterPacks.sessions.gradeAndUp', { grade: t(`eduLibrary.grade.${bands[0]}`) });
  }
  return bands.map((b) => t(`eduLibrary.grade.${b}`)).join(' · ');
}

export const chipClass =
  'inline-flex items-center rounded-neo border-2 border-neo-black px-2 py-0.5 text-xs font-black font-neo-body uppercase text-neo-black';

export const actionClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black px-4 py-2.5 font-neo-body text-sm font-black text-neo-black shadow-hard-sm transition duration-100 hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan motion-reduce:transition-none motion-reduce:hover:translate-y-0 disabled:opacity-60';

export function CardArt({ pose }: { pose: EduMascotPose | undefined }) {
  if (!pose) return null;
  return createElement(Image, {
    src: EDU_MASCOT[pose],
    alt: '',
    width: 512,
    height: 512,
    sizes: '72px',
    className: 'size-16 shrink-0 object-contain @xl:size-18',
  });
}
