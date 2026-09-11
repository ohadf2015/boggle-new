/**
 * ClassroomResultsCard
 *
 * The end of a classroom game is a moment, not a report. In order:
 *  1. the PODIUM — three names, three scores, the winner in the middle;
 *  2. the class's word coverage in one glance — one number, one bar, the chips;
 *  3. one tap to rematch, one tap to the full report.
 * Everything else (seven ways to send the missed words home) lives behind a
 * disclosure, because a teacher standing in front of 30 children reads one
 * button, not eight.
 *
 * Renders from the server-built `classroomSummary` in the shared results
 * payload — NOT from the teacher's sessionStorage, which is why the previous
 * lesson card was blank for every student in the room.
 *
 * Two audiences, one card: a student sees their own hits and misses, the
 * teacher sees class-wide coverage and the reteach list. Either can share the
 * CLASS-level gap (no student names) with parents / Slack.
 *
 * Layout and links live in components/education/results/*; this file decides
 * what the room sees and in what order.
 */

'use client';

import { GraduationCap, Check, RotateCcw, Share2, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ResultsPodium, type PodiumEntry } from './results/ResultsPodium';
import { StudentRoundOutcome } from './results/StudentRoundOutcome';
import { WordCoverageGlance } from './results/WordCoverageGlance';
import { ClassNeedsHelp } from './results/ClassNeedsHelp';
import { ReteachActions } from './results/ReteachActions';
import { ResultsPrimaryActions } from './results/ResultsPrimaryActions';
import { useReteachLinks } from './results/useReteachLinks';
import type { ClassroomSummary } from '@/shared/types/classroom';

export interface ClassroomResultsCardProps {
  summary: ClassroomSummary;
  username: string;
  isTeacher: boolean;
  /** Sends the player into flashcard practice on this lesson. */
  onPractice?: () => void;
  /** Teacher-only: starts a new round on exactly the words the class missed. */
  onReteach?: () => void;
  /** Teacher-only: same list, same code — a new round without recreating the room. */
  onRematch?: () => void;
  /**
   * Final standings, best first, exactly as the server sorted them. Present
   * only on the live results page; the card renders without it (an older
   * payload, a printed recap) minus the student's placing hero. Never used to
   * re-rank — `summary.podium` remains the one ranking in the system.
   */
  standings?: Array<{ username: string; score: number }>;
}

export function ClassroomResultsCard({
  summary,
  username,
  isTeacher,
  onPractice,
  onReteach,
  onRematch,
  standings,
}: ClassroomResultsCardProps) {
  const { t, language } = useLanguage();
  const links = useReteachLinks(summary, isTeacher);

  // `neverPlacedWords` is a subset of `missedWords`: lesson words the board
  // generator never embedded. Absent means "we cannot tell" — then every miss
  // reads as a miss, exactly as before. Never treat an unknown source as proof.
  const neverPlaced = new Set((summary.neverPlacedWords ?? []).map((w) => w.toLowerCase()));
  const missedOnBoard = summary.missedWords.filter((w) => !neverPlaced.has(w.toLowerCase()));

  const podium: PodiumEntry[] = (summary.podium ?? []).map((p) => ({
    username: p.username,
    score: p.score,
    rank: p.rank,
    detail:
      typeof p.wordsFound === 'number' && typeof p.totalWords === 'number'
        ? t('education.results.podium.wordsFound', { found: p.wordsFound, total: p.totalWords })
        : undefined,
  }));

  return (
    <div className="p-5 rounded-neo border-neo border-neo-black bg-neo-navy shadow-hard">
      <div className="flex items-start gap-3 mb-4">
        <GraduationCap className="w-6 h-6 text-neo-lime shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h3 className="text-neo-white font-neo-display font-bold text-lg leading-tight">
            {t('education.results.title')}
          </h3>
          <p className="text-neo-white/70 font-neo-body text-sm">
            {summary.lessonNames.join(', ')} · {summary.teacherName}
          </p>
        </div>
      </div>

      {/* My round first, then the room's. A student holding a phone wants one
          answer before anything else, and it is not the class average. */}
      {!isTeacher && standings && standings.length > 0 && (
        <StudentRoundOutcome
          username={username}
          standings={standings}
          mastery={summary.masteryByPlayer[username]}
          t={t}
        />
      )}

      {podium.length > 0 && (
        <div className="mb-5">
          <p className="mb-3 font-neo-display font-bold text-xs uppercase tracking-widest text-neo-yellow">
            {t('education.results.podium.title')}
          </p>
          <ResultsPodium entries={podium} t={t} />
        </div>
      )}

      <WordCoverageGlance
        summary={summary}
        username={username}
        isTeacher={isTeacher}
        neverPlaced={neverPlaced}
        t={t}
      />

      {/* Coverage says how the CLASS did; this says which children to pull
          aside, while they are still in the room. */}
      {isTeacher && <ClassNeedsHelp masteryByPlayer={summary.masteryByPlayer} t={t} />}

      {isTeacher && summary.participationBonus ? (
        <p
          data-testid="participation-bonus-note"
          className="mb-4 p-3 rounded-neo border border-neo-lime/40 bg-neo-lime/10 text-neo-white font-neo-body text-sm"
        >
          {t('education.results.participationBonus', { points: summary.participationBonus })}
        </p>
      ) : null}

      {/* The two taps that matter, side by side and above the fold. Mounted
          only for the teacher — the Pro check inside must not fire on thirty
          student phones that never see the link. */}
      {isTeacher && (
        <ResultsPrimaryActions language={language} onRematch={onRematch} t={t} />
      )}

      {isTeacher &&
        (summary.missedWords.length > 0 ? (
          <div
            data-testid="reteach-list"
            className="p-3 rounded-neo border border-neo-pink/40 bg-neo-pink/10"
          >
            {missedOnBoard.length > 0 ? (
              <>
                <p className="text-neo-white font-bold text-sm mb-1">
                  {t('education.results.reteach')}
                </p>
                <p
                  data-testid="missed-on-board-words"
                  className="text-neo-white/80 font-neo-body text-sm"
                >
                  {missedOnBoard.join(', ')}
                </p>
              </>
            ) : (
              <p
                data-testid="all-board-words-found"
                className="text-neo-white font-bold text-sm"
              >
                {t('education.results.allBoardWordsFound')}
              </p>
            )}

            {neverPlaced.size > 0 && (
              <div
                data-testid="never-placed-words"
                className="mt-3 p-3 rounded-neo border border-dashed border-neo-white/30 bg-neo-navy/60"
              >
                <p className="flex items-center gap-2 text-neo-white/80 font-bold text-sm mb-1">
                  <EyeOff className="w-4 h-4 shrink-0" aria-hidden />
                  {t('education.results.neverPlaced')}
                </p>
                <p className="text-neo-white/70 font-neo-body text-sm">
                  {summary.neverPlacedWords?.join(', ')}
                </p>
                <p className="mt-1 text-neo-white/50 font-neo-body text-xs">
                  {t('education.results.neverPlacedHint')}
                </p>
              </div>
            )}

            <ReteachActions links={links} onReteach={onReteach} t={t} />
          </div>
        ) : (
          <p className="p-3 rounded-neo border border-neo-lime/40 bg-neo-lime/10 text-neo-white font-neo-body text-sm">
            {t('education.results.allFound')}
          </p>
        ))}

      <button
        type="button"
        data-testid="share-class-gap"
        onClick={links.onShareGap}
        className={cn(
          'mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
          'bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo',
          'shadow-hard hover:shadow-hard-lg transition-all'
        )}
      >
        {links.shareState === 'idle' ? (
          <>
            <Share2 className="w-5 h-5" aria-hidden />
            {t('education.results.shareGap')}
          </>
        ) : (
          <>
            <Check className="w-5 h-5" aria-hidden />
            {t('education.results.shareGapCopied')}
          </>
        )}
      </button>

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
