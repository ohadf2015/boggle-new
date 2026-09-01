/**
 * ClassroomResultsCard
 *
 * The results screen a classroom game deserves: not "who won", but "which of
 * today's words landed".
 *
 * Renders from the server-built `classroomSummary` in the shared results
 * payload — NOT from the teacher's sessionStorage, which is why the previous
 * lesson card was blank for every student in the room.
 *
 * Two audiences, one card:
 *  - a student sees their own hits and misses,
 *  - the teacher sees class-wide coverage and the reteach list.
 */

'use client';

import { GraduationCap, Check, X, RotateCcw, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ClassroomSummary } from '@/shared/types/classroom';

export interface ClassroomResultsCardProps {
  summary: ClassroomSummary;
  username: string;
  isTeacher: boolean;
  /** Sends the player into flashcard practice on this lesson. */
  onPractice?: () => void;
  /** Teacher-only: starts a new round on exactly the words the class missed. */
  onReteach?: () => void;
}

export function ClassroomResultsCard({
  summary,
  username,
  isTeacher,
  onPractice,
  onReteach,
}: ClassroomResultsCardProps) {
  const { t } = useLanguage();

  // A late joiner has no mastery row; treat them as having found nothing rather
  // than crashing or hiding the card.
  const mine = summary.masteryByPlayer[username] ?? {
    found: 0,
    total: summary.totalWords,
  };

  const foundByMe = (word: { foundBy: string[] }) =>
    word.foundBy.some((n) => n.toLowerCase() === username.toLowerCase());

  return (
    <div className="p-5 rounded-neo border-neo border-neo-black bg-neo-navy shadow-hard">
      <div className="flex items-start gap-3 mb-4">
        <GraduationCap className="w-6 h-6 text-neo-lime shrink-0 mt-0.5" />
        <div>
          <h3 className="text-neo-white font-neo-display font-bold text-lg leading-tight">
            {t('education.results.title')}
          </h3>
          <p className="text-neo-white/70 font-neo-body text-sm">
            {summary.lessonNames.join(', ')} · {summary.teacherName}
          </p>
        </div>
      </div>

      <p className="text-neo-white font-bold mb-3">
        {isTeacher
          ? t('education.results.classCoverage', {
              found: summary.classFoundCount,
              total: summary.totalWords,
            })
          : t('education.results.yourMastery', {
              found: mine.found,
              total: mine.total,
            })}
      </p>

      <ul className="flex flex-wrap gap-2 mb-4">
        {summary.coverage.map((entry) => {
          // For the teacher "found" means the class found it; for a student it
          // means they personally did. Same list, different question.
          const found = isTeacher ? entry.foundBy.length > 0 : foundByMe(entry);
          return (
            <li
              key={entry.word}
              data-testid={`lesson-word-${entry.word}`}
              data-found={String(found)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-neo border-neo-black text-sm font-bold',
                found
                  ? 'bg-neo-lime text-neo-black'
                  : 'bg-neo-navy-light text-neo-white/60'
              )}
            >
              {found ? (
                <Check className="w-4 h-4" aria-hidden />
              ) : (
                <X className="w-4 h-4" aria-hidden />
              )}
              <span>{entry.word}</span>
              {isTeacher && entry.foundBy.length > 0 && (
                <span className="ms-1 text-xs opacity-70">{entry.foundBy.length}</span>
              )}
            </li>
          );
        })}
      </ul>

      {isTeacher &&
        (summary.missedWords.length > 0 ? (
          <div
            data-testid="reteach-list"
            className="p-3 rounded-neo border border-neo-pink/40 bg-neo-pink/10"
          >
            <p className="text-neo-white font-bold text-sm mb-1">
              {t('education.results.reteach')}
            </p>
            <p className="text-neo-white/80 font-neo-body text-sm">
              {summary.missedWords.join(', ')}
            </p>
            {onReteach && (
              <button
                type="button"
                data-testid="play-reteach-round"
                onClick={onReteach}
                className={cn(
                  'mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm',
                  'bg-neo-pink text-neo-black border-neo border-neo-black rounded-neo',
                  'shadow-hard-sm hover:shadow-hard transition-all'
                )}
              >
                <Play className="w-4 h-4" aria-hidden />
                {t('education.results.playReteachRound')}
              </button>
            )}
          </div>
        ) : (
          <p className="p-3 rounded-neo border border-neo-lime/40 bg-neo-lime/10 text-neo-white font-neo-body text-sm">
            {t('education.results.allFound')}
          </p>
        ))}

      {onPractice && (
        <button
          type="button"
          onClick={onPractice}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-cyan text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg transition-all'
          )}
        >
          <RotateCcw className="w-5 h-5" aria-hidden />
          {t('education.results.practiceMissed')}
        </button>
      )}
    </div>
  );
}
