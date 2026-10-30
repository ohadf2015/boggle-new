'use client';

import { RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DailyScoreSave } from './useDailyScoreSave';

/** Shown only when the day's score failed to reach the server; nothing otherwise. */
export default function ScoreSaveNotice({ save }: { save: Pick<DailyScoreSave, 'state' | 'retry'> }) {
  const { t } = useLanguage();
  if (save.state !== 'failed') return null;
  return (
    <p
      data-testid="score-save-failed"
      role="status"
      className="flex items-center justify-center gap-2 rounded-neo border-2 border-neo-pink bg-neo-pink/10 px-3 py-2 text-center font-neo-body text-sm font-bold text-neo-white"
    >
      {t('connections.daily.scoreNotSaved')}
      <button
        type="button"
        onClick={save.retry}
        className="inline-flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 text-xs font-black text-neo-navy shadow-hard-sm"
      >
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />
        {t('connections.daily.retrySave')}
      </button>
    </p>
  );
}
