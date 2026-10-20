'use client';
import { useLanguage } from '@/contexts/LanguageContext';

export interface TrialRecap {
  games: number;
  students: number;
}

/** What the teacher actually ran; renders nothing for zero games so a blank month is never framed as progress. Guests join by code and are not on the roster, so an empty roster prints games only. */
export function TrialRecapLine({ recap, className }: { recap?: TrialRecap | null; className?: string }) {
  const { t } = useLanguage();
  if (!recap || recap.games <= 0) return null;
  return (
    <p data-testid="trial-recap" className={className}>
      {recap.students > 0
        ? t('education.trial.recap', { games: recap.games, students: recap.students })
        : t('education.trial.recapGamesOnly', { games: recap.games })}
    </p>
  );
}
