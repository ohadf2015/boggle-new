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
import type { ResultsStanding } from './results/resultsStandings';
import { StudentRoundOutcome } from './results/StudentRoundOutcome';
import { WinnerSpotlight } from './results/WinnerSpotlight';
import { CelebrationLoop } from './results/CelebrationLoop';
import { WordCoverageGlance } from './results/WordCoverageGlance';
import { useRoundEndReveal } from './results/useRoundEndReveal';
import { useSessionRoundHistory } from '@/hooks/useSessionRoundHistory';
import { useOverlayQuietZoneClaim } from '@/lib/overlayQuietZone';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';
import { podiumWithoutHost, standingsWithoutHost } from '@/lib/education/roundEndPodium';
import { isRevealed, sweepReached } from '@/lib/education/roundEndStage';
import { classSwept as isClassSwept } from '@/lib/education/roundEndSweep';
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
  standings?: ResultsStanding[];
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
  // Nothing may cover this. A "Make LexiClash yours" style picker opened
  // full-screen over a student's "YOU WON! 257 POINTS" here on a phone — the
  // third auto-opening overlay to bury this moment. The recap now raises the
  // quiet zone for as long as it is on screen, and every auto-opening prompt
  // in the app consults it before opening (lib/overlayQuietZone).
  useOverlayQuietZoneClaim(true, 'classroom-results');

  const { t, language } = useLanguage();
  const links = useReteachLinks(summary, isTeacher);
  const stage = useRoundEndReveal(true);

  // The student's own line in the server's standings — the one row this card is
  // allowed to bank. Bots ride along in the payload and are not classmates.
  // One computation, read by the history hook and by the coverage meter — the
  // phone and the projector must never disagree about whether the class swept
  // it (Pitfall Class 3: two renderers, one number).
  // Discounts lesson words the board never carried — without that a sweep was
  // arithmetically impossible on any partial board, which is every normal
  // round. See lib/education/roundEndSweep.
  const classSwept = isClassSwept({
    totalWords: summary.totalWords,
    classFoundCount: summary.classFoundCount,
    neverPlacedCount: summary.neverPlacedWords
      ? new Set(summary.neverPlacedWords.map((w) => w.toLowerCase())).size
      : undefined,
  });

  // Bots are not classmates, and neither is the teacher: a classroom host is
  // forced into broadcast mode yet still rides along in the server's standings,
  // which told a student they came "2nd of 4" in a class of three. One helper,
  // shared with the projector (`lib/education/roundEndPodium`).
  const classmates = standingsWithoutHost(standings, summary.teacherName);
  const humans = classmates.filter((p) => !(p as { isBot?: boolean }).isBot);
  const myIndex = humans.findIndex(
    (p) => p.username.trim().toLowerCase() === username.trim().toLowerCase()
  );
  const { momentum } = useSessionRoundHistory({
    sessionKey: sessionKeyFor(summary),
    score: myIndex >= 0 ? humans[myIndex].score : 0,
    rank: myIndex + 1,
    players: humans.length,
    sweep: classSwept,
    // A teacher's card is a report, not a scoreboard; and nothing is banked
    // until this player actually has a placing, so a card that mounts before
    // the scores settle cannot record a zero (Pitfall Class 3).
    ready: !isTeacher && myIndex >= 0,
  });

  // `neverPlacedWords` is a subset of `missedWords`: lesson words the board
  // generator never embedded. Absent means "we cannot tell" — then every miss
  // reads as a miss, exactly as before. Never treat an unknown source as proof.
  const neverPlaced = new Set((summary.neverPlacedWords ?? []).map((w) => w.toLowerCase()));
  const missedOnBoard = summary.missedWords.filter((w) => !neverPlaced.has(w.toLowerCase()));

  const podium: PodiumEntry[] = podiumWithoutHost(summary.podium, summary.teacherName).map((p) => ({
    username: p.username,
    score: p.score,
    rank: p.rank,
    detail:
      typeof p.wordsFound === 'number' && typeof p.totalWords === 'number'
        ? t('education.results.podium.wordsFound', { found: p.wordsFound, total: p.totalWords })
        : undefined,
  }));

  // The winner's fanfare belongs to the winner's own phone. Every other phone
  // in the room shows the same bar, the same mascot and the same name — in
  // silence. `viewerWon` is read off the SERVER's podium, never re-ranked here.
  const viewerWon =
    !!podium[0] && podium[0].username.trim().toLowerCase() === username.trim().toLowerCase();

  return (
    <div
      data-testid="classroom-results-card"
      // Self-describing for a screenshot harness (and for a human wondering
      // whether the podium is mid-reveal or broken): poll for `done`.
      data-round-end-stage={stage}
      className="p-5 rounded-neo border-[2px] border-neo-black bg-neo-navy shadow-hard"
    >
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
      {!isTeacher && humans.length > 0 && (
        <StudentRoundOutcome
          username={username}
          standings={classmates}
          mastery={summary.masteryByPlayer[username]}
          momentum={momentum}
          t={t}
        />
      )}

      {podium.length > 0 && (
        <div className="relative mb-5">
          {/* `relative` above bounds the celebration to this block: it never
              covers the actions below it and is never fullscreen.
              Same rule as the win sting: this phone celebrates when ITS owner
              won, or when it is the teacher's device standing in for the
              room's screen. Twenty-nine phones cheering for someone else is
              noise. Unlike the one-shot canvas burst, this keeps running, so a
              shot taken seconds later still shows a celebration. */}
          <CelebrationLoop active={isRevealed(1, stage) && (isTeacher || viewerWon)} />
          <p className="mb-3 font-neo-display font-bold text-xs uppercase tracking-widest text-neo-yellow">
            {t('education.results.podium.title')}
          </p>
          <ResultsPodium entries={podium} stage={stage} t={t} />
          {podium[0] && (
            <div className="mt-3">
              <WinnerSpotlight
                winner={{ username: podium[0].username, score: podium[0].score }}
                active={isRevealed(1, stage)}
                // The teacher's own device is the room's screen when it is the
                // only one; a student's is not. And on a swept round the sweep
                // chime takes the screen's one sound — see ClassroomTvResults.
                cue={(isTeacher || viewerWon) && !classSwept}
                t={t}
              />
            </div>
          )}
        </div>
      )}

      <WordCoverageGlance
        summary={summary}
        username={username}
        isTeacher={isTeacher}
        neverPlaced={neverPlaced}
        fill={sweepReached(stage)}
        celebrate={sweepReached(stage)}
        // The sweep is the room's, so every phone SHOWS it — not only the
        // phones whose owner personally found all of them. The chime is a
        // different question: thirty phones chiming out of sync is noise, so
        // only the room's screen (and the winner's own phone) makes it.
        classSwept={classSwept}
        cue={isTeacher || viewerWon}
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

      {/* Teacher only. The class's gap, worded for an adult, is a report — and
          a report sent from thirty student phones is thirty copies of the same
          message to the wrong audience. A student's screen keeps one action
          (below), which is the whole of round 2's "nine competing CTAs" note. */}
      {isTeacher && (
      <button
        type="button"
        data-testid="share-class-gap"
        onClick={links.onShareGap}
        className={cn(
          'mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
          'bg-neo-lime text-neo-black border-[3px] border-neo-black rounded-neo',
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
      )}

      {onPractice && (
        <button
          type="button"
          onClick={onPractice}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-cyan text-neo-black border-[3px] border-neo-black rounded-neo',
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
