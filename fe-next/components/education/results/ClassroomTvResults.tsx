/**
 * ClassroomTvResults — the end of a classroom round, on the projector.
 *
 * Both projector routes render this one wall: /education/live through
 * EduHostResults and the /multiplayer fallback through ClassroomTvResultsScreen.
 * A classroom host is forced into broadcast mode, so the teacher never reaches
 * ResultsPage / ClassroomResultsCard; this IS their results screen. Which
 * results route a round takes reads `classroomSummary`, the same value this
 * component renders from (lib/education/roundEndResultsRoute).
 *
 * Left, the moment: the podium reveal (third, second, a beat, the winner) and
 * the winner bar. Right, what the room does next: the class's numbers, the
 * words still to teach, one Play again. Every celebration is earned by a real
 * score (`roundOutcome`); a boss round that ended without points hands the
 * whole moment to the boss card above.
 *
 * Nothing here is an entrance tween: plinths, bar, strip and meter are painted
 * from the first frame and the reveal only swaps what is written inside them,
 * so any instant can be screenshotted and reduced motion reads complete
 * (Pitfall Class 5). Dark-only: `bg-neo-navy` is hardcoded.
 */

'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { PodiumStage } from './PodiumStage';
import { ClassChest } from './ClassChest';
import ClassroomSessionStandings from './ClassroomSessionStandings';
import { TeamBattleStandings } from '../TeamBattleStandings';
import { WinnerSpotlight } from './WinnerSpotlight';
import { CelebrationLoop } from './CelebrationLoop';
import { ClassPulse } from './ClassPulse';
import { TvCoveragePanel } from './TvCoveragePanel';
import { TvRecapHeader } from './TvRecapHeader';
import { useRoundEndReveal } from './useRoundEndReveal';
import { FINAL_STAGE, isRevealed } from '@/lib/education/roundEndStage';
import { classSwept } from '@/lib/education/roundEndSweep';
import { sessionKeyFor } from '@/lib/education/roundEndHistory';
import { projectorRecapShowsTeacherFollowUp } from '@/lib/education/roundEndResultsRoute';
import { useSessionRoundHistory } from '@/hooks/useSessionRoundHistory';
import { useOverlayQuietZoneClaim } from '@/lib/overlayQuietZone';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { HostNextActions } from './HostNextActions';
import { ReteachActions } from './ReteachActions';
import { ResultsPrimaryActions } from './ResultsPrimaryActions';
import { cn } from '@/lib/utils';
import { ZeroRoundNote } from './ZeroRoundNote';
import { EmptyRoundCard } from './EmptyRoundCard';
import { useReteachLinks } from './useReteachLinks';
import { useReplayMissedWords } from '@/components/education/live/useReteachRound';
import { reteachVerdict } from '@/components/education/live/eduReteachModel';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { useIsPhoneRecap } from './useIsPhoneRecap';
import { buildTvRecap } from './tvRecapModel';
import type { PlayerResult } from '@/types/components';
import type { Socket } from 'socket.io-client';
import { isPracticeRound } from './isPracticeRound';

export interface ClassroomTvResultsProps {
  summary: ClassroomSummary;
  /** Restages the same list in the same room. Hidden when the host has none. */
  onRematch?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Paint the finished reveal at once. Only the dev preview's `&settled=1` sets it. */
  revealSettled?: boolean;
  /** Back to the lobby (mode switcher). Absent = no way back is offered. */
  onChangeGame?: () => void;
  /** The host's confirmed exit to the teacher HQ. */
  onBackToClass?: () => void;
  /** Final scores: the class's numbers, the podium when the round carries none, and the words found when no lesson word landed. */
  players?: PlayerResult[];
  gameCode?: string;
  socket?: Socket | null;
}

export function ClassroomTvResults({
  summary,
  onRematch,
  t,
  revealSettled = false,
  onChangeGame,
  onBackToClass,
  players,
  gameCode,
  socket,
}: ClassroomTvResultsProps) {
  // Mounts only for the non-playing classroom host; the predicate still asks,
  // so a routing change drops the follow-up instead of doubling it.
  const showTeacherFollowUp = projectorRecapShowsTeacherFollowUp({ hostPlaying: false, hasClassroomSummary: true });
  const { language } = useLanguage();
  const links = useReteachLinks(summary, true);
  const reteach = useReplayMissedWords({ summary, gameCode, socket: socket ?? getSharedSocketIfExists(), onRematch });

  // A projector in front of thirty children is no place for an install banner.
  useOverlayQuietZoneClaim(true, 'classroom-tv-results');

  const phone = useIsPhoneRecap();
  const { podium, outcome, landed, stats, roundScores } = buildTvRecap(summary, players, t);
  const bossStatus = useClassroomBossStore((s) => s.view?.status);
  const bossOver = bossStatus === 'defeated' || bossStatus === 'escaped';
  // A boss round's points can all be zero while the class dealt real damage: the boss card above is the story then.
  const showPodium = podium.length > 0 && !(bossOver && !outcome.celebrate);
  const stage = useRoundEndReveal(!revealSettled && outcome.celebrate);
  const neverPlaced = new Set((summary.neverPlacedWords ?? []).map((w) => w.toLowerCase()));
  const swept = classSwept({
    totalWords: summary.totalWords,
    classFoundCount: summary.classFoundCount,
    neverPlacedCount: summary.neverPlacedWords ? neverPlaced.size : undefined,
  });

  // The class's numbers live under their own key, so a teacher device that
  // also rendered the student card never has two writers on one value.
  const { roundNumber, sweepStreak } = useSessionRoundHistory({
    sessionKey: `${sessionKeyFor(summary)}::class`,
    score: summary.classFoundCount,
    rank: 0,
    players: Object.keys(summary.masteryByPlayer).length,
    sweep: swept,
    ready: summary.totalWords > 0,
  });

  const winnerBeat = outcome.celebrate && isRevealed(1, stage);
  const settled = stage === FINAL_STAGE || !outcome.celebrate;
  const rounds = summary.roundsPlayed ?? roundNumber;
  const hasStage = showPodium || (outcome.kind === 'empty' && !bossOver);

  return (
    <div
      data-testid="classroom-tv-results"
      // A capture waits on this for the finished frame instead of calling a mid-beat podium broken.
      data-round-end-stage={stage}
      data-outcome={outcome.kind}
      className="h-full overflow-y-auto lg:overflow-hidden flex flex-col gap-3 lg:gap-4 bg-neo-navy text-neo-white"
    >
      <TvRecapHeader
        title={
          !hasStage
            ? null
            : outcome.celebrate
              ? t('education.results.podium.title')
              : t(outcome.kind === 'empty' ? 'eduLive.results.emptyTitle' : 'eduLive.results.lineupTitle')
        }
        lessonNames={summary.lessonNames}
      />

      {/* Plain span utilities: an arbitrary track list was never generated on the wall and the grid fell back to one column. */}
      <div
        data-testid="tv-recap-columns"
        className="grid grid-cols-1 lg:grid-cols-5 2xl:grid-cols-3 gap-3 lg:gap-5 lg:flex-1 lg:min-h-0 max-lg:mb-auto"
      >
        {/* `relative` bounds the celebration to this column: never over Play again, never fullscreen. */}
        {hasStage && (
        <div className="relative lg:col-span-3 2xl:col-span-2 lg:min-h-0 flex flex-col gap-3 lg:gap-4">
          {/* The winner bar already stands down to "top hitter" when the boss got away; so does the party. */}
          <CelebrationLoop active={winnerBeat && showPodium && bossStatus !== 'escaped'} className="z-10" />
          {outcome.kind === 'empty' && !bossOver && <EmptyRoundCard t={t} />}
          {showPodium && (
            <PodiumStage
              entries={podium}
              muted={!outcome.celebrate}
              stage={stage}
              t={t}
              // The art is 16:9-ish, so its width is capped by the height left under the header (and the boss card, when one is up).
              className={bossOver ? 'lg:w-[min(100%,calc((100dvh_-_30rem)*1.768))]' : 'lg:w-[min(100%,calc((100dvh_-_19rem)*1.768))]'}
            >
              {landed && <ClassChest found={summary.classFoundCount} total={summary.totalWords} open={winnerBeat} t={t} />}
              {!outcome.celebrate && <ZeroRoundNote t={t} />}
            </PodiumStage>
          )}
          {showPodium && podium[0] && (
            <WinnerSpotlight
              winner={{ username: podium[0].username, score: podium[0].score }}
              outcome={outcome.kind}
              leaders={outcome.leaders}
              active={isRevealed(1, stage)}
              // One sound per screen: on a swept round the sweep chime owns it.
              cue={!swept}
              size={phone ? 'card' : 'projector'}
              t={t}
              className="z-20 shrink-0"
            />
          )}
        </div>
        )}

        <div className={cn('lg:min-h-0 flex flex-col gap-3 lg:gap-4', hasStage ? 'lg:col-span-2 2xl:col-span-1' : 'lg:col-span-5 2xl:col-span-3 lg:mx-auto lg:w-full lg:max-w-4xl')}>
          {/* A team battle is what the room was playing for, so it comes first. */}
          {summary.teamBattle?.scores?.length ? (
            <TeamBattleStandings teams={summary.teamBattle.teams} scores={summary.teamBattle.scores} />
          ) : null}

          {summary.sessionStandings?.length ? (
            <ClassroomSessionStandings
              standings={summary.sessionStandings}
              roundsPlayed={summary.roundsPlayed ?? 1}
              roundScores={roundScores}
              settled={settled}
              maxRows={phone ? undefined : 3}
              t={t}
            />
          ) : null}

          {/* The session table or the boss card already tells the class's story; on a short wall the strip yields to them. */}
          {stats && (
            <div className={cn(!phone && (summary.sessionStandings?.length || bossOver) && 'lg:[@media(max-height:900px)]:hidden')}>
              <ClassPulse stats={stats} active={winnerBeat} size={phone ? 'card' : 'projector'} t={t} />
            </div>
          )}

          <TvCoveragePanel
            summary={summary}
            players={players}
            neverPlaced={neverPlaced}
            stage={stage}
            pointsWithoutLesson={!landed && outcome.celebrate}
            phone={phone}
            maxChips={bossOver ? 8 : 12}
            verdict={reteachVerdict(summary).kind}
            t={t}
          />

          <HostNextActions
            language={language}
            t={t}
            onRematch={onRematch}
            onChangeGame={onChangeGame}
            onBackToClass={onBackToClass}
            // The session table already says "after N rounds"; a second round chip would only cost the wall a row.
            roundNumber={summary.sessionStandings?.length ? 0 : rounds}
            sweepStreak={sweepStreak}
            reteachSlot={
              showTeacherFollowUp && (reteach.missed.length > 0 || summary.missedWords.length > 0) ? (
                <div data-testid="classroom-tv-reteach">
                  <ReteachActions
                    links={links}
                    onReteach={reteach.start}
                    reteachStatus={reteach.status}
                    onRestoreFull={reteach.restoreFull}
                    sendHome={summary.missedWords.length > 0}
                    t={t}
                    variant="more"
                  />
                </div>
              ) : null
            }
            followUpSlot={
              // Small, unfilled, held until the 5.8s celebration beat; transform-only arrival (Class 5).
              showTeacherFollowUp ? (
                <div
                  data-testid="tv-followup-after-celebration"
                  className={cn('flex justify-center', !revealSettled && 'motion-safe:animate-[lc-quiet-arrive_360ms_ease-out_5.8s_both]')}
                >
                  <style>{`@keyframes lc-quiet-arrive{0%{transform:scale(0)}70%{transform:scale(1.06)}100%{transform:scale(1)}}`}</style>
                  <ResultsPrimaryActions language={language} t={t} surface="projector" tone="quiet" hideUpgrade={isPracticeRound(players)} />
                </div>
              ) : null
            }
          />
        </div>
      </div>
    </div>
  );
}

export default ClassroomTvResults;
