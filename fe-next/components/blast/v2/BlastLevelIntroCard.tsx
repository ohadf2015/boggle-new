'use client';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastLevel } from '@/lib/blast/v2/types';

export function BlastLevelIntroCard({ level, onDismiss }: { level: BlastLevel; onDismiss: () => void }) {
  const { t } = useLanguage();
  useEffect(() => {
    const id = setTimeout(onDismiss, 1500);
    return () => clearTimeout(id);
  }, [onDismiss]);
  return (
    <div data-testid="intro-card" className="grid place-items-center min-h-screen bg-[#0b1530]/90 text-white">
      <div className="space-y-2 text-center">
        <div className="text-3xl font-bold">
          {t('blast.intro.level', `Level ${level.levelNumber}`, { n: String(level.levelNumber) })}
        </div>
        <div className="text-xl">{t(`blast.themes.${level.theme}`, level.theme)}</div>
        <div className="text-sm opacity-70">
          {t('blast.intro.wordCount', `${level.words.length} words`, { count: String(level.words.length) })}
        </div>
      </div>
    </div>
  );
}
