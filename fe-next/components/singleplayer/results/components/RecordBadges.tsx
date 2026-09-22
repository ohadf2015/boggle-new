'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface RecordBadgesProps {
  scoreIsRecord: boolean;
  wordIsRecord: boolean;
  score: number;
  longestWord: string;
}

function NewRecordBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-neo border-2 border-neo-black bg-neo-lime px-1.5 py-0.5 text-[10px] font-black uppercase text-neo-black">
      {label}
    </span>
  );
}

/**
 * Lime "NEW RECORD" chips sitting on the score and/or the longest word.
 * The score numeral is LTR; the word itself is not (Hebrew words stay RTL).
 */
export function RecordBadges({ scoreIsRecord, wordIsRecord, score, longestWord }: RecordBadgesProps) {
  const { t } = useLanguage();
  if (!scoreIsRecord && !wordIsRecord) return null;
  const label = t('singlePlayer.records.newRecord');

  return (
    <div className="flex flex-wrap items-center justify-center gap-2" data-testid="record-badges">
      {scoreIsRecord ? (
        <span data-testid="record-score" className="inline-flex items-center gap-1.5">
          <span dir="ltr" className="font-black text-neo-white">{score}</span>
          <NewRecordBadge label={label} />
        </span>
      ) : null}
      {wordIsRecord ? (
        <span data-testid="record-word" className="inline-flex items-center gap-1.5">
          <span className="font-black uppercase text-neo-white">{longestWord}</span>
          <NewRecordBadge label={label} />
        </span>
      ) : null}
    </div>
  );
}

/** Additive count of missions cleared this round. Hidden at 0 / when unknown. */
export function MissionsCompletedNote({ count }: { count: number | undefined }) {
  const { t } = useLanguage();
  if (!count) return null;
  return (
    <p data-testid="missions-completed" className="text-center text-xs font-black text-neo-lime">
      <span dir="ltr">{count}/3</span>
      {' '}
      {t('singlePlayer.missions.done')}
    </p>
  );
}
