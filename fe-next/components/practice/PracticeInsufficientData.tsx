'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ArrowLeft } from 'lucide-react';
import { DRILL_ROOT_CLASS } from './drillLayout';

interface PracticeInsufficientDataProps {
  onBack: () => void;
  /** Extra test id for a drill that already asserted a specific marker. */
  testId?: string;
}

/**
 * Friendly dead-end when a deep-linked drill has too little lesson data to
 * play. Always includes the drill's normal back button.
 */
export function PracticeInsufficientData({
  onBack,
  testId,
}: PracticeInsufficientDataProps) {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  return (
    <div
      data-testid="practice-insufficient-data"
      data-unavailable={testId}
      className={DRILL_ROOT_CLASS}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="shrink-0 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label={t('common.back')}
          className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
        >
          <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-neo border-3 border-black shadow-hard bg-neo-cream p-6 text-center">
          <h2 className="text-2xl font-neo-display text-neo-black mb-2">
            {t('education.practice.insufficientData.title')}
          </h2>
          <p className="font-neo-body text-neo-black/80 text-pretty">
            {t('education.practice.insufficientData.body')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PracticeInsufficientData;
