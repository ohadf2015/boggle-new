'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import ModeIntroCard from '@/components/game/ModeIntroCard';
import { useModeFirstSeen, type IntroMode } from '@/hooks/useModeFirstSeen';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';

interface Props {
  mode: IntroMode;
  locale: string;
}

/**
 * Cozy practice mode entry. Always shows ModeIntroCard (regardless of MP first-seen
 * state) — this surface is the "explore safely" path, so the intro is the point.
 * Marks the mode as seen so subsequent MP drops skip the intro splash.
 */
export default function PracticePageClient({ mode, locale }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const { markSeen } = useModeFirstSeen(mode);

  const handleContinue = useCallback(() => {
    markSeen();
    router.push(practiceTargetUrl(mode, locale));
  }, [markSeen, router, mode, locale]);

  return <ModeIntroCard mode={mode} t={t} onContinue={handleContinue} />;
}
