/**
 * ClassroomTvResults — the end of a classroom round, on the projector.
 *
 * A classroom host is FORCED into broadcast mode (`useHostViewState` hard-sets
 * `hostPlaying=false` for any room with lesson data) and `useHostGameEvents`
 * keeps a broadcast host here — so the teacher never reaches ResultsPage /
 * ClassroomResultsCard. This IS their results screen. That routing had a
 * mode-shaped hole until 2026-09-12: an arcade-only wheel-rush bypass also
 * fired for lesson rooms, so a REMATCH whose next-round mode was `random` and
 * drew wheel-rush ejected the teacher to the arcade results page and this
 * screen never mounted. Both decisions now read `classroomSummary`, the same
 * value this component renders from — see lib/education/roundEndResultsRoute.
 *
 * Same three beats as the card, sized for the back of a classroom:
 *  1. the PODIUM — three names, three scores, the winner tallest;
 *  2. the class's word coverage in one glance;
 *  3. one tap to run it again — the host's own start-new-game path, which
 *     emits resetGame + startGame on the SAME gameCode, and the server
 *     re-embeds the same stored lesson words (gameStartHandler always
 *     regenerates a classroom board from classroomGame.vocabularyWords). So
 *     "same list, same code" is literal, not a hopeful label.
 *  4. ReteachActions — the host is forced onto this wall (`hostLeavesProjectorRecap`)
 *     and never mounts ClassroomResultsCard, so re-teach / share / assign live
 *     here too. Same `useReteachLinks` + `stageReteachLessonData` as the phone
 *     card; the disclosure stays collapsed so the wall still fits.
 *  5. The Pro progress-report ask — the same `ResultsPrimaryActions` the card
 *     mounts, without a second Rematch. #1120 landed that ask on the card
 *     alone. `projectorRecapShowsTeacherFollowUp` is the gate, so a student
 *     phone (which never mounts this screen) cannot grow it.
 *
 * Everything is server-built (`ClassroomSummary`), so the projector, the
 * teacher's laptop and every student phone celebrate the same three names.
 * Dark-only surface: `bg-neo-navy` is hardcoded, never the cream/dark pair
 * that flashes cream on a lazy mount.
 *
 * THE REVEAL. Third, second, a beat, then the winner — with Lexi's trophy loop,
 * one short sting and confetti on that last beat, and the coverage meter
 * filling behind it. None of it is an entrance tween: the plinths, the
 * spotlight bar and the meter are all painted from the first frame and the
 * reveal only swaps what is written inside them, which is why this screen can
 * be screenshotted at any instant and why it is fully readable under
 * `prefers-reduced-motion` with no motion at all (Pitfall Class 5).
 */

'use client';

import { Flame, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { PodiumEntry } from './ResultsPodium';
import { PodiumStage } from './PodiumStage';
import { ClassChest } from './ClassChest';
import { tr } from '@/components/education/lobby/eduText';
import ClassroomSessionStandings from './ClassroomSessionStandings';
import { TeamBattleStandings } from '../TeamBattleStandings';
import { WordCoverageGlance } from './WordCoverageGlance';
import { WinnerSpotlight } from './WinnerSpotlight';
import { CelebrationLoop } from './CelebrationLoop';
import { useRoundEndReveal } from './useRoundEndReveal';
import { isRevealed, sweepReached } from '@/lib/education/roundEndStage';
import { classSwept } from '@/lib/education/roundEndSweep';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';
import { podiumWithoutHost } from '@/lib/education/roundEndPodium';
import { stageReteachLessonData } from '@/lib/education/classroomGameHandoff';
import { projectorRecapShowsTeacherFollowUp } from '@/lib/education/roundEndResultsRoute';
import { useSessionRoundHistory } from '@/hooks/useSessionRoundHistory';
import { useOverlayQuietZoneClaim } from '@/lib/overlayQuietZone';
import { ReteachActions } from './ReteachActions';
import { ResultsPrimaryActions } from './ResultsPrimaryActions';
import { useReteachLinks } from './useReteachLinks';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { trackResultsAction } from './trackResultsAction';
import { orderPodiumByScore } from './podiumOrder';
import { useIsPhoneRecap } from './useIsPhoneRecap';

export interface ClassroomTvResultsProps {
  summary: ClassroomSummary;
  /** Restages the same list in the same room. Hidden when the host has none. */
  onRematch?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ClassroomTvResults({ summary, onRematch, t }: ClassroomTvResultsProps) {
  // This screen only mounts for the non-playing classroom host. The inputs
  // are that fact. The predicate still calls hostLeavesProjectorRecap, so if
  // that rule starts sending this host to ResultsPage the wall drops the
  // actions instead of showing them next to the card.
  const showTeacherFollowUp = projectorRecapShowsTeacherFollowUp({
    hostPlaying: false,
    hasClassroomSummary: true,
  });
  const { language } = useLanguage();
  // `isTeacher: true` so the same link builders the phone card uses actually
  // produce hrefs (they gate on it).
  const links = useReteachLinks(summary, true);
  const handleReteach = () => {
    if (!stageReteachLessonData(summary)) return;
    window.location.reload();
  };

  // `neverPlacedWords` is a subset of `missedWords`: lesson words the board
  // generator never embedded. Absent means "we cannot tell" — then every miss
  // reads as a miss. Never treat an unknown source as proof.
  const neverPlaced = new Set((summary.neverPlacedWords ?? []).map((w) => w.toLowerCase()));

  // Nothing may cover this. A wall projector in front of thirty children is the
  // worst possible place for an install banner or a consent sheet, and this
  // screen lives on /multiplayer — not a game route, so no route list and no
  // in-game body class ever protected it. It raises the quiet zone itself.
  useOverlayQuietZoneClaim(true, 'classroom-tv-results');

  const stage = useRoundEndReveal(true);
  // Discounts the lesson words the board never carried. Without that, a sweep
  // was arithmetically impossible on any partial board — see lib/education/
  // roundEndSweep — which is why this burst has never been seen.
  const swept = classSwept({
    totalWords: summary.totalWords,
    classFoundCount: summary.classFoundCount,
    neverPlacedCount: summary.neverPlacedWords ? neverPlaced.size : undefined,
  });

  // The projector's story is the CLASS's, so it banks the class's numbers under
  // its own key — a teacher device that also rendered the student card must
  // never have the two write over each other (Pitfall Class 1: one value, two
  // writers).
  const { roundNumber, sweepStreak } = useSessionRoundHistory({
    sessionKey: `${sessionKeyFor(summary)}::class`,
    score: summary.classFoundCount,
    rank: 0,
    players: Object.keys(summary.masteryByPlayer).length,
    sweep: swept,
    ready: summary.totalWords > 0,
  });

  // The teacher is not a contestant. A classroom host is forced into broadcast
  // mode but still sits in the room's socket list, so the server's sort put a
  // zero-scoring adult on the top plinth of a real projector — see
  // `lib/education/roundEndPodium`. One helper, shared with the phone card.
  // Rank follows SCORE, once, here — and the pedestals AND the winner bar read
  // this same array, so gold and "winner" can never name two different
  // children (Pitfall Class 3). PodiumStage re-sorts defensively as well.
  const phone = useIsPhoneRecap();
  const podium: PodiumEntry[] = orderPodiumByScore(podiumWithoutHost(summary.podium, summary.teacherName).map((p) => ({
    username: p.username,
    score: p.score,
    rank: p.rank,
    detail:
      typeof p.wordsFound === 'number' && typeof p.totalWords === 'number'
        ? t('education.results.podium.wordsFound', { found: p.wordsFound, total: p.totalWords })
        : undefined,
  })));

  return (
    <div
      data-testid="classroom-tv-results"
      // The reveal announces where it is, so a screenshot harness can wait for
      // the finished frame instead of catching the podium mid-beat and calling
      // it broken. Every stage is painted; `done` is simply the whole story.
      data-round-end-stage={stage}
      className="h-full overflow-y-auto lg:overflow-hidden flex flex-col gap-2 lg:gap-3 bg-neo-navy text-neo-white"
    >
      <header className="shrink-0 flex flex-wrap items-baseline justify-center gap-x-4">
        <p className="font-neo-display font-black uppercase tracking-widest text-neo-yellow text-lg md:text-2xl">
          {t('education.results.podium.title')}
        </p>
        <p className="font-neo-body font-bold text-neo-white/80 text-sm md:text-xl truncate max-w-full">
          {summary.lessonNames.join(' · ')}
        </p>
      </header>

      {/* A wall is wide. The podium and the winner take the long side; the
          class's number and the one button take the short one, so BOTH halves
          of the moment — who won, and what we do next — are on the screen at
          the same time instead of a scroll apart. */}
      <div
        data-testid="tv-recap-columns"
        // Plain span utilities, not an arbitrary `[1.4fr_1fr]` track list:
        // measured on the wall, `lg:grid-cols-[1.4fr_1fr]` was never generated
        // and the grid silently fell back to ONE column — two stacked rows,
        // the coverage list squeezed to a height of literally zero. Tailwind
        // emits arbitrary values only from class strings it can see, and a
        // results screen is the worst place to find out it could not.
        className="grid grid-cols-1 lg:grid-cols-5 gap-2 lg:gap-4 lg:flex-1 lg:min-h-0"
      >
        {/* `relative` only so the celebration can be bounded to this column.
            It falls over the podium and the winner bar, never over the
            Rematch button in the next column and never over the whole page —
            a fullscreen animated layer is the Class-5 shape we do not ship. */}
        <div className="relative lg:col-span-3 lg:min-h-0 flex flex-col justify-center gap-2 lg:gap-3">
          {/* Starts on the winner's beat and never stops while the recap is
              up. `fireRankConfetti` still fires its one live burst for the
              people in the room; this is what a shutter that opens four
              seconds later actually photographs. */}
          <CelebrationLoop active={isRevealed(1, stage)} />
          {/* The podium stands on the painted pedestals of podium-bg, with the
              CLASS's chest on the same stage. Width is capped by the viewport
              height so the art, the spotlight and the header all fit a 16:9
              wall without the column growing a scrollbar. */}
          {podium.length > 0 && (
            <PodiumStage
              entries={podium}
              stage={stage}
              t={t}
              className="lg:w-[min(100%,calc((100dvh_-_19rem)*1.768))]"
            >
              <ClassChest
                found={summary.classFoundCount}
                total={summary.totalWords}
                open={isRevealed(1, stage)}
                t={t}
              />
            </PodiumStage>
          )}

          {podium[0] && (
            <WinnerSpotlight
              winner={{ username: podium[0].username, score: podium[0].score }}
              active={isRevealed(1, stage)}
              // ONE sound per screen. When the class swept it, the sweep chime
              // 500ms later owns the moment — one child winning is one child's
              // moment; a class that found every word did something together.
              // Two stings half a second apart is the "it screamed at us" bug.
              cue={!swept}
              size={phone ? 'card' : 'projector'}
              t={t}
            />
          )}
        </div>

        <div className="lg:col-span-2 lg:min-h-0 flex flex-col gap-2 lg:gap-3">
          {/* The podium to the left is THIS round. From round two on, the room
              is asking a different question than the podium answers — see
              `ClassroomSessionStandings`. Absent on a single-round session,
              where the podium already is the answer. */}
          {/* In a team battle the podium answers the wrong question entirely:
              the room was playing for a side, and the side's result lived only
              on the students' own phones (`ResultsPage`). First, because it is
              what the class was actually competing for. */}
          {summary.teamBattle?.scores?.length ? (
            <TeamBattleStandings
              teams={summary.teamBattle.teams}
              scores={summary.teamBattle.scores}
            />
          ) : null}

          {summary.sessionStandings?.length ? (
            <ClassroomSessionStandings
              standings={summary.sessionStandings}
              roundsPlayed={summary.roundsPlayed ?? 1}
              t={t}
            />
          ) : null}

          <section className="lg:flex-1 lg:min-h-0 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-3 pt-3 pb-0 lg:p-4 shadow-hard">
            {/* No username: `isTeacher` means class-wide coverage, so the
                per-player mastery lookup is never consulted. Only the words
                still to teach are printed, capped — the wall is for the next
                lesson, not for a register of what already went right. */}
            <WordCoverageGlance
              summary={summary}
              username=""
              isTeacher
              neverPlaced={neverPlaced}
              size={phone ? 'card' : 'projector'}
              fill={sweepReached(stage)}
              celebrate={sweepReached(stage)}
              missedOnly
              maxChips={phone ? 6 : 12}
              t={t}
            />
          </section>

          {onRematch || summary.missedWords.length > 0 || showTeacherFollowUp ? (
            <div className="shrink-0 flex flex-col gap-2">
              {onRematch && (
                <button
                  type="button"
                  data-testid="classroom-tv-rematch"
                  onClick={() => {
                    trackResultsAction('rematch', 'projector');
                    onRematch();
                  }}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 px-4 py-3 md:px-6 md:py-4',
                    'font-neo-display font-black text-2xl md:text-4xl',
                    'bg-neo-lime text-neo-black border-4 border-neo-black rounded-neo-lg',
                    'shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-0.5 active:translate-y-0.5 transition-all'
                  )}
                >
                  <RotateCcw className="w-8 h-8 shrink-0" aria-hidden />
                  <span className="flex flex-col items-start leading-none">
                    <span className="uppercase">{tr(t, 'academy.results.playAgain', 'Play again')}</span>
                    <span className="mt-1 font-neo-body text-sm font-bold normal-case md:text-base">
                      {tr(t, 'academy.results.playAgainHint', 'Same words, same code. Nobody rejoins.')}
                    </span>
                  </span>
                </button>
              )}

              {showTeacherFollowUp && summary.missedWords.length > 0 && (
                <div data-testid="classroom-tv-reteach">
                  <ReteachActions links={links} onReteach={handleReteach} t={t} />
                </div>
              )}

              {/* Momentum, not decoration: a room that can see it is on round
                  three plays round four. Both chips are silent in round one. */}
              {(roundNumber > 1 || sweepStreak > 1) && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {roundNumber > 1 && (
                    <span
                      data-testid="classroom-tv-round"
                      className="px-4 py-2 rounded-neo border-[2px] border-neo-cream bg-neo-navy text-neo-cream font-neo-display font-bold text-xl shadow-hard-sm"
                    >
                      {t('education.results.moment.roundOfSession', { round: roundNumber })}
                    </span>
                  )}
                  {sweepStreak > 1 && (
                    <span
                      data-testid="classroom-tv-sweep-streak"
                      className="flex items-center gap-2 px-4 py-2 rounded-neo border-[2px] border-neo-black bg-neo-orange text-neo-black font-neo-display font-black text-xl shadow-hard-sm"
                    >
                      <Flame className="w-6 h-6 shrink-0" aria-hidden />
                      {t('education.results.moment.sweepStreak', { count: sweepStreak })}
                    </span>
                  )}
                </div>
              )}

              {/* No onRematch: this wall already has the loud Rematch above.
                  The shared component still owns the Pro check, so a free
                  teacher gets the upgrade ask and a Pro teacher gets the
                  report — the same branch the phone card uses.
                  LAST, small and unfilled, and it pops in only after the
                  celebration beat (5.8s = the reveal's `done`): the room's
                  moment is the winner and Play again, never a price tag.
                  Transform-only arrival on a small element (never an
                  opacity fade, Class 5); static under reduced motion. The
                  mount — and so the impression — is unchanged. */}
              {showTeacherFollowUp && (
                <div
                  data-testid="tv-followup-after-celebration"
                  className="flex justify-center motion-safe:animate-[lc-quiet-arrive_360ms_ease-out_5.8s_both]"
                >
                  <style>{`@keyframes lc-quiet-arrive{0%{transform:scale(0)}70%{transform:scale(1.06)}100%{transform:scale(1)}}`}</style>
                  <ResultsPrimaryActions language={language} t={t} surface="projector" tone="quiet" />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ClassroomTvResults;
