'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNextPracticeMode, nextPracticeUrl } from '@/lib/practice/practiceRoute';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  currentMode: PracticeMode;
  className?: string;
}

export default function PracticeChainCta({ currentMode, className }: Props) {
  const { language, t } = useLanguage();
  const next = getNextPracticeMode(currentMode);
  const href = nextPracticeUrl(currentMode, language);
  const label = next ? t(`practice.continueTo.${next}`) : t('practice.allDone');

  return (
    <Link
      href={href}
      data-testid="practice-chain-cta"
      className={
        className ??
        'inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px]'
      }
    >
      {label}
    </Link>
  );
}
