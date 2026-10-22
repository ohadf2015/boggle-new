'use client';

import { EyeOff } from 'lucide-react';
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { ReteachStatus } from '@/components/education/live/useReteachRound';
import { reteachVerdict } from '@/components/education/live/eduReteachModel';
import { ReteachActions } from './ReteachActions';
import type { ReteachLinks } from './useReteachLinks';

interface ClassroomReteachBoxProps {
  summary: ClassroomSummary;
  neverPlaced: Set<string>;
  links: ReteachLinks;
  onReteach?: () => void;
  reteachStatus?: ReteachStatus;
  onRestoreFull?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** The phone card's words still to teach: the same verdict and the same list the wall replays. */
export function ClassroomReteachBox({ summary, neverPlaced, links, onReteach, reteachStatus, onRestoreFull, t }: ClassroomReteachBoxProps) {
  const verdict = reteachVerdict(summary);
  const sendHome = summary.missedWords.length > 0;

  if (verdict.kind !== 'replay' && !sendHome) {
    return (
      <p className="p-3 rounded-neo border border-neo-lime/40 bg-neo-lime/10 text-neo-white font-neo-body text-sm">
        {t('education.results.allFound')}
      </p>
    );
  }

  const missedOnBoard = summary.missedWords.filter((w) => !neverPlaced.has(w.toLowerCase()));

  return (
    <div data-testid="reteach-list" className="p-3 rounded-neo border border-neo-pink bg-neo-pink/10">
      {verdict.kind === 'replay' ? (
        <>
          <p className="text-neo-white font-bold text-sm mb-2">{t('eduLiveRoom.hostResults.mostMissed')}</p>
          <ul className="flex flex-wrap gap-1.5">
            {verdict.words.map((w) => (
              <li
                key={w.word}
                data-testid="reteach-word"
                data-word={w.word}
                dir="auto"
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 font-neo-display text-sm font-black text-neo-black"
              >
                {w.word}
                <span dir={w.notOnBoard ? undefined : 'ltr'} className="font-neo-body text-xs font-bold tabular-nums text-neo-black/70">
                  {w.notOnBoard ? t('eduLiveRoom.hostResults.notOnBoard') : `${w.found}/${w.of}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : verdict.kind === 'wholeLesson' ? (
        <p data-testid="reteach-whole-lesson" className="text-neo-white font-bold text-sm">
          {t('education.results.wholeLessonAgain')}
        </p>
      ) : missedOnBoard.length > 0 ? (
        <>
          <p className="text-neo-white font-bold text-sm mb-1">{t('education.results.reteach')}</p>
          <p data-testid="missed-on-board-words" className="text-neo-white/80 font-neo-body text-sm">
            {missedOnBoard.join(', ')}
          </p>
        </>
      ) : (
        <p data-testid="all-board-words-found" className="text-neo-white font-bold text-sm">
          {t('education.results.allBoardWordsFound')}
        </p>
      )}

      {neverPlaced.size > 0 && (
        <div data-testid="never-placed-words" className="mt-3 p-3 rounded-neo border border-dashed border-neo-white/50 bg-neo-navy/60">
          <p className="flex items-center gap-2 text-neo-white/80 font-bold text-sm mb-1">
            <EyeOff className="w-4 h-4 shrink-0" aria-hidden />
            {t('education.results.neverPlaced')}
          </p>
          <p className="text-neo-white/70 font-neo-body text-sm">{summary.neverPlacedWords?.join(', ')}</p>
          <p className="mt-1 text-neo-white/50 font-neo-body text-xs">{t('education.results.neverPlacedHint')}</p>
        </div>
      )}

      <ReteachActions
        links={links}
        onReteach={verdict.kind === 'replay' ? onReteach : undefined}
        reteachStatus={reteachStatus}
        onRestoreFull={onRestoreFull}
        sendHome={sendHome}
        t={t}
      />
    </div>
  );
}

export default ClassroomReteachBox;
