'use client';

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useHapticFeedback, GAME_HAPTICS } from '@/hooks/useHapticFeedback';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { initPyramidState, type PyramidState } from '@/lib/connections/pyramid/gameLogic';
import { dailyPyramid } from '@/lib/connections/pyramid/daily';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';
import { patchDailyResult, saveDailyResult } from '@/lib/connections/dailyResultStore';
import { getSolvedIds, markSolved } from '@/lib/connections/solvedStore';
import { buildPyramidShareGrid } from '@/lib/connections/pyramid/shareGrid';
import { todayUTC, markConnectionsPlayedToday, advanceClientStreak, type SubmitPayload } from '@/lib/connections/dailyClient';
import { gridCallout, type BridgeOutcome } from '@/lib/connections/shareGrid';
import { stripEmoji } from '@/lib/share/stripEmoji';
import type { GameState } from '@/lib/connections/types';
import PyramidProgress from './PyramidProgress';
import PyramidHeader from './PyramidHeader';
import RankBadge from '../RankBadge';
import ProgressCard from '../ProgressCard';
import { useBridgeProgress } from '../useBridgeProgress';
import { PyramidLeftRail, PyramidRightRail } from './PyramidShellRails';
import { GameShell, SHELL_MEDIA } from '@/components/game/shell';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import FinaleCard from './FinaleCard';
import PuzzleCard from '../PuzzleCard';
import BridgeFinishBeat, { useFinishBeat } from '../BridgeFinishBeat';
import PyramidDailyResults from './PyramidDailyResults';
import PyramidEndScreen from './PyramidEndScreen';
import PyramidOutOfLives from './PyramidOutOfLives';
import { useStoredDailyResult } from '../useStoredDailyResult';
import { useDailyScoreSave } from '../useDailyScoreSave';
import ScoreSaveNotice from '../ScoreSaveNotice';
import { pyramidReducer } from './pyramidReducer';
import { clearPyramidRun, loadPyramidRun, usePyramidRunSave, type StoredPyramidRun } from './pyramidRunStore';

const UNREACHED: BridgeOutcome = { reached: false, solved: false, wrongAttempts: 0, hintUsed: false };

/**
 * Bridge Pyramid — a three-stage tower where solving all 3 base riddles
 * unlocks the finale. The bridges from the 3 stages become clues for the
 * final meta-answer puzzle.
 *
 * `sharePath` — when the run is hosted as the day's daily variant
 * (/connections/daily), share links point back at the daily host so
 * recipients land on the same quest; standalone play keeps the pyramid route.
 * It also marks the daily host: the end screen hands off to the next daily
 * quest, and today's finished run is restored on revisit.
 */
export default function PyramidChallenge({
  sharePath,
  onTerminal,
  today: hostToday,
}: {
  sharePath?: string;
  /** Told once the run is terminal (live finish OR a restored revisit). */
  onTerminal?: () => void;
  /** The daily host's frozen UTC day. */
  today?: string;
} = {}) {
  // Null-guard wrapper: the early return must happen BEFORE any of the run's
  // hooks mount (rules-of-hooks), so the actual game lives in PyramidRun.
  const { language } = useLanguage();
  const ownToday = useRef(todayUTC()).current;
  const today = hostToday ?? ownToday;
  const isDailyHost = Boolean(sharePath);
  const [solvedPyramids] = useState<ReadonlySet<string>>(() => getSolvedIds('pyramid', language));
  const stored = useStoredDailyResult<StoredPyramidResult>(today, language, 'pyramid');
  const [savedRun] = useState(() => (isDailyHost && typeof window !== 'undefined' ? loadPyramidRun(today) : null));
  // Daily host: render nothing until storage is read, rather than a fresh
  // pyramid that flips to the end screen a frame later.
  if (isDailyHost && !stored.checked) return null;
  const restored = isDailyHost ? stored.value : null;
  // Today's run is stored → reopen THAT pyramid. Winning marks it solved, so
  // the solved filter would otherwise serve a different one on revisit.
  const resumable = !restored && savedRun
    ? getPyramidsForLocale(savedRun.language).find((p) => p.id === savedRun.pyramidId)
    : undefined;
  const pyramid = restored
    ? (getPyramidsForLocale(restored.language).find((p) => p.id === restored.pyramidId) ?? dailyPyramid(today, restored.language))
    : (resumable ?? dailyPyramid(today, language, solvedPyramids));
  if (!pyramid) return null;
  const restoredRun = restored && restored.pyramidId === pyramid.id ? restored : null;
  const resumedRun = resumable && savedRun ? savedRun : null;
  return (
    <PyramidRun
      key={restoredRun ? 'restored' : resumedRun ? 'resumed' : 'live'}
      pyramid={pyramid}
      today={today}
      sharePath={sharePath}
      restored={restoredRun}
      resumed={resumedRun}
      runLanguage={restored?.language ?? resumedRun?.language ?? language}
      onTerminal={onTerminal}
    />
  );
}

/** Today's finished daily pyramid, as persisted for a same-day revisit. */
interface StoredPyramidResult {
  kind: 'pyramid';
  pyramidId: string;
  state: Omit<PyramidState, 'pyramid'>;
  outcomes: [number, BridgeOutcome][];
  streak: number;
  /** Set until the server has the score; absent on results stored before pyramid days were submitted. */
  pendingSubmit?: SubmitPayload | null;
}

function PyramidRun({
  pyramid,
  today,
  sharePath,
  restored,
  resumed,
  runLanguage,
  onTerminal,
}: {
  pyramid: NonNullable<ReturnType<typeof dailyPyramid>>;
  today: string;
  sharePath?: string;
  restored: StoredPyramidResult | null;
  /** An unfinished daily run saved before a reload. */
  resumed: StoredPyramidRun | null;
  runLanguage: string;
  onTerminal?: () => void;
}) {
  const { t, language } = useLanguage();
  const { isAdmin, profile } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const { haptic, customHaptic } = useHapticFeedback();
  const sfx = useSoundEffects();
  const inShell = useMediaQuery(SHELL_MEDIA);

  const [pyramidState, dispatch] = useReducer(pyramidReducer, pyramid, (p) => {
    const saved = restored?.state ?? resumed?.state;
    return saved ? { ...saved, pyramid: p } : initPyramidState(p);
  });
  const [input, setInput] = useState('');
  const progressApi = useBridgeProgress();
  const { onBridgeSolved, onDayPlayed } = progressApi;

  const startRef = useRef<number>(0);
  const wrongByStageRef = useRef<Record<number, number>>({ ...resumed?.wrongByStage });
  const outcomesRef = useRef<Map<number, BridgeOutcome>>(new Map(restored?.outcomes ?? resumed?.outcomes ?? []));
  const prevStatusRef = useRef(pyramidState.status);
  const prevWrongRef = useRef(pyramidState.wrongAttempts);
  const [results, setResults] = useState<{ copied: boolean }>({ copied: false });

  const isTerminal = pyramidState.status === 'won' || pyramidState.status === 'lost';
  const beat = useFinishBeat(isTerminal && !restored);
  const isResolved = pyramidState.status === 'correct' || pyramidState.status === 'gaveUp';
  const baseStage = pyramidState.stage < 3;
  const currentPuzzle =
    baseStage && pyramidState.stage >= 0 && pyramidState.stage < 3
      ? pyramid.base[pyramidState.stage as 0 | 1 | 2]
      : null;

  // Synthetic GameState for PuzzleCard (base stages only)
  const synthGameState: GameState = baseStage
    ? {
        puzzles: [currentPuzzle!],
        currentIndex: 0,
        score: pyramidState.score,
        streak: 0,
        lives: pyramidState.lives,
        wrongAttempts: pyramidState.wrongAttempts,
        status: (pyramidState.status as any) as GameState['status'],
        input,
        completedIds: new Set(),
        ratedIds: new Set(),
        hintRevealed: pyramidState.hintRevealed,
      }
    : ({} as GameState);

  // Stamp start time once mounted; a resumed run keeps the time it already used.
  useEffect(() => {
    startRef.current = Date.now() - (resumed?.elapsedMs ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Daily-parity: finishing a pyramid (won OR lost) counts as playing the Word
  // Bridge daily quest. The 5-riddle daily writes the same markers on its own
  // terminal, so without this a pyramid day would show an unplayed quest card
  // and silently break the day streak. Stamped once — the terminal effect can
  // re-fire on unrelated re-renders.
  // A restored run was stamped when it was played.
  const dailyStampedRef = useRef(Boolean(restored));
  const [clientStreak, setClientStreak] = useState(restored?.streak ?? 0);
  const streakRef = useRef(restored?.streak ?? 0);
  useEffect(() => {
    if (!isTerminal || dailyStampedRef.current) return;
    dailyStampedRef.current = true;
    markConnectionsPlayedToday(today);
    onDayPlayed(today);
    streakRef.current = advanceClientStreak(today).streak;
    setClientStreak(streakRef.current);
  }, [isTerminal, today, onDayPlayed]);

  // Tell the host before paint so its in-game chrome never lingers beside the
  // end screen.
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;
  useLayoutEffect(() => {
    if (isTerminal) onTerminalRef.current?.();
  }, [isTerminal]);

  // Per-answer feedback (sound + haptic) and outcome tracking
  useEffect(() => {
    const stage = pyramidState.stage;
    if (pyramidState.status === 'correct' && prevStatusRef.current !== 'correct') {
      onBridgeSolved();
      sfx.playMatchFoundSound();
      customHaptic(GAME_HAPTICS.validWord);
      outcomesRef.current.set(stage, {
        reached: true,
        solved: true,
        wrongAttempts: wrongByStageRef.current[stage] ?? 0,
        hintUsed: pyramidState.hintRevealed,
      });
    } else if (
      pyramidState.status === 'wrong' &&
      // A second miss leaves the status on 'wrong' — the attempt counter is the signal.
      pyramidState.wrongAttempts !== prevWrongRef.current
    ) {
      wrongByStageRef.current[stage] = (wrongByStageRef.current[stage] ?? 0) + 1;
      sfx.playErrorSound();
      haptic('error');
    } else if (pyramidState.status === 'gaveUp' && prevStatusRef.current !== 'gaveUp') {
      outcomesRef.current.set(stage, {
        reached: true,
        solved: false,
        wrongAttempts: wrongByStageRef.current[stage] ?? 0,
        hintUsed: pyramidState.hintRevealed,
      });
    } else if (pyramidState.status === 'won' && prevStatusRef.current !== 'won') {
      onBridgeSolved();
      sfx.playVictorySound();
      // On the daily host the results hero owns the one celebration.
      if (!sharePath && !prefersReducedMotion) fireVictoryConfetti();
      // Beaten pyramids never come back — future days pick from unsolved ones.
      if (pyramid) markSolved('pyramid', language, pyramid.id);
      outcomesRef.current.set(3, {
        reached: true,
        solved: true,
        wrongAttempts: pyramidState.wrongAttempts,
        hintUsed: pyramidState.hintRevealed,
      });
    } else if (pyramidState.status === 'lost' && prevStatusRef.current !== 'lost') {
      outcomesRef.current.set(3, {
        reached: pyramidState.stage === 3,
        solved: false,
        wrongAttempts: pyramidState.wrongAttempts,
        hintUsed: pyramidState.hintRevealed,
      });
    }
    prevStatusRef.current = pyramidState.status;
    prevWrongRef.current = pyramidState.wrongAttempts;
  }, [pyramidState.status, pyramidState.stage, pyramidState.hintRevealed, pyramidState.wrongAttempts, sfx, haptic, customHaptic, prefersReducedMotion, pyramid, language, onBridgeSolved, sharePath]);

  // After the outcome effect, so a reload on a just-resolved riddle keeps its outcome.
  usePyramidRunSave({
    enabled: Boolean(sharePath),
    today,
    language: runLanguage,
    state: pyramidState,
    isTerminal,
    snapshot: () => ({
      outcomes: Array.from(outcomesRef.current.entries()),
      wrongByStage: { ...wrongByStageRef.current },
      elapsedMs: startRef.current ? Date.now() - startRef.current : 0,
    }),
  });

  // Daily host: persist the terminal run (after the outcome effect above has
  // recorded the finale) so a same-day revisit reopens this end screen, then
  // submit it — a pyramid day counts for the server streak, quests and chest.
  const save = useDailyScoreSave(today, (outcome) => {
    if (outcome.status === 'saved') patchDailyResult(today, { streak: outcome.result.streak });
  });
  const { send } = save;
  const savedRef = useRef(Boolean(restored));
  useEffect(() => {
    if (!isTerminal || !sharePath || savedRef.current) return;
    savedRef.current = true;
    const { pyramid: _omit, ...state } = pyramidState;
    const outcomes = Array.from(outcomesRef.current.entries());
    const payload: SubmitPayload = {
      puzzleDate: today,
      language: runLanguage,
      displayName: profile?.display_name || profile?.username || t('connections.daily.guestName'),
      score: pyramidState.score,
      timeTakenSeconds: startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0,
      puzzlesSolved: outcomes.filter(([, o]) => o.solved).length,
      avatarEmoji: profile?.avatar_emoji,
      avatarColor: profile?.avatar_color,
      avatarImage: profile?.avatar_image,
    };
    saveDailyResult(today, runLanguage, {
      kind: 'pyramid',
      pyramidId: pyramid.id,
      state,
      outcomes,
      streak: streakRef.current,
      pendingSubmit: payload,
    } satisfies StoredPyramidResult);
    clearPyramidRun(today);
    void send(payload);
  }, [isTerminal, sharePath, pyramidState, today, runLanguage, pyramid.id, profile, t, send]);

  useEffect(() => {
    if (restored?.pendingSubmit && sharePath) void send(restored.pendingSubmit);
    // Once per mount: a score that never reached the server gets one more try.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback((value: string) => setInput(value), []);
  const handleSubmit = useCallback(() => {
    if (input.trim().length > 0) {
      dispatch({ type: 'GUESS', input });
      setInput('');
    }
  }, [input]);

  const handleGiveUp = useCallback(() => {
    dispatch({ type: 'GIVE_UP' });
  }, []);

  const handleRevealHint = useCallback(() => {
    dispatch({ type: 'REVEAL_HINT' });
  }, []);

  const handleAdvance = useCallback(() => {
    dispatch({ type: 'ADVANCE' });
    setInput('');
  }, []);

  const handleRevive = useCallback(() => {
    dispatch({ type: 'REVIVE' });
    setInput('');
  }, []);

  // The revive button used to call handleRevive directly — it was LABELLED
  // "watch an ad" but granted the revive for free. Gate it on a real rewarded
  // ad (admins keep the free refill).
  const reviveAd = useRewardedFeatureUnlock({
    placement: 'connections_pyramid_revive',
    surface: 'retry',
    onUnlock: handleRevive,
    disabled: isAdmin || pyramidState.status !== 'outOfLives',
    context: { pyramidId: pyramid.id, stage: pyramidState.stage },
  });

  const shareText = useCallback((): string => {
    const at = (i: number) => outcomesRef.current.get(i) ?? UNREACHED;
    const base = [at(0), at(1), at(2)] as const;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/${sharePath ?? `${language}/connections/pyramid`}` : undefined;
    return buildPyramidShareGrid({
      title: t('connections.pyramid.title'),
      dateISO: today,
      base,
      finale: at(3),
      score: pyramidState.score,
      callout: t(`connections.daily.shareCallout.${gridCallout([...base, at(3)])}`),
      url,
    });
  }, [t, language, today, pyramidState.score, sharePath]);

  const handleShare = useCallback(async () => {
    try {
      const text = stripEmoji(shareText());
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setResults({ copied: true });
      }
    } catch {
      /* user cancelled / unsupported */
    }
  }, [shareText]);

  // Terminal state: won/lost
  if (isTerminal && beat.showing) {
    return (
      <BridgeFinishBeat
        planks={pyramid.base.map((p, i) => ({ word: p.bridge, solved: Boolean(outcomesRef.current.get(i)?.solved) }))}
        top={{ word: pyramid.metaAnswer, solved: pyramidState.status === 'won' }}
        headline={t(pyramidState.status === 'won' ? 'connections.pyramid.won' : 'connections.pyramid.lost')}
        onDone={beat.done}
      />
    );
  }

  if (isTerminal && sharePath) {
    return (
      <PyramidDailyResults
        pyramid={pyramid}
        state={pyramidState}
        outcomes={[0, 1, 2, 3].map((i) => outcomesRef.current.get(i) ?? UNREACHED)}
        celebrate={!restored}
        shareText={shareText()}
        progressSlot={<ProgressCard api={progressApi} todayISO={today} />}
        notice={<ScoreSaveNotice save={save} />}
      />
    );
  }

  if (isTerminal) {
    return (
      <PyramidEndScreen
        state={pyramidState}
        streak={clientStreak}
        copied={results.copied}
        onShare={handleShare}
        progressSlot={<ProgressCard api={progressApi} todayISO={today} />}
      />
    );
  }

  if (pyramidState.status === 'outOfLives' && !isResolved) {
    return (
      <PyramidOutOfLives
        isAdmin={isAdmin}
        reviveAd={reviveAd}
        onRevive={handleRevive}
        onAcceptLoss={handleAdvance}
      />
    );
  }

  // Playing state
  return (
    <GameShell
      mode="word-chain"
      accent="purple"
      left={inShell ? <PyramidLeftRail t={t} state={pyramidState} metaAnswer={pyramid.metaAnswer} /> : null}
      right={<PyramidRightRail t={t} state={pyramidState} />}
    >
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4 shell:my-auto shell:max-w-[40rem] shell:px-0" data-testid="pyramid-root">
      {!inShell && (
        <PyramidHeader
          daily={Boolean(sharePath)}
          state={pyramidState}
          metaAnswer={pyramid.metaAnswer}
          rankSlot={<RankBadge standing={progressApi.standing} rankUpId={progressApi.rankUpId} onRankUpShown={progressApi.dismissRankUp} />}
        />
      )}

      {pyramidState.stage < 3 ? (
        <>
          <PuzzleCard
            puzzle={currentPuzzle!}
            state={synthGameState}
            isAdmin={isAdmin}
            onInputChange={handleInput}
            onSubmit={handleSubmit}
            onGiveUp={handleGiveUp}
            onRevealHint={handleRevealHint}
            onRate={() => {}}
            onNext={handleAdvance}
            showRating={false}
          />
        </>
      ) : (
        <FinaleCard
          bridges={pyramidState.solvedBridges}
          pyramid={pyramid}
          input={input}
          wrongAttempts={pyramidState.wrongAttempts}
          hintRevealed={pyramidState.hintRevealed}
          status={pyramidState.status}
          onInputChange={handleInput}
          onSubmit={handleSubmit}
          onGiveUp={handleGiveUp}
          onRevealHint={handleRevealHint}
          onNext={handleAdvance}
          isAdmin={isAdmin}
        />
      )}
    </div>
    </GameShell>
  );
}
