'use client';
import { useLanguage } from '@/contexts/LanguageContext';

export function BlastLevelCompleteCard({
  coins,
  cascadeCount,
  onNext,
}: {
  coins: number;
  cascadeCount: number;
  onNext: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div data-testid="complete-card" className="grid place-items-center min-h-screen bg-[#0b1530]/95 text-white">
      <div className="space-y-4 text-center">
        <div className="text-4xl font-bold">{t('blast.complete.title', 'Level Complete!')}</div>
        <div className="text-2xl">🪙 +{coins}</div>
        {cascadeCount > 0 && (
          <div className="text-lg">
            ⚡ {t('blast.complete.cascades', `${cascadeCount} cascades`, { n: String(cascadeCount) })}
          </div>
        )}
        <button
          onClick={onNext}
          className="px-6 py-3 bg-[#ec4899] border-4 border-white rounded-lg font-bold text-lg"
          data-testid="next-btn"
        >
          {t('blast.complete.next', 'Next Level')}
        </button>
      </div>
    </div>
  );
}
