import { describe, it, expect, vi } from 'vitest';
import { buildMpResultsProps } from '@/app/[locale]/multiplayer/MpPhaseRouter';
import { createPlayerResultsHandlers } from '@/player/hooks/socket/playerResultsHandlers';

vi.mock('@/utils/logger', () => ({ default: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const ref = <T,>(current: T) => ({ current });

describe('the results screen knows the played mode from the server payload', () => {
  it('a joiner hands the payload mode to the results screen', () => {
    const onShow = vi.fn();
    const handlers = createPlayerResultsHandlers({
      socket: { emit: vi.fn() } as never,
      username: 'Ann',
      gameSessionIdRef: ref(1),
      hasProcessedResultsRef: ref<number | null>(null),
      resultsDisplayedRef: ref<number | null>(null),
      emptyResultsFallbackRef: ref<number | null>(null),
      waitingStartTimeRef: ref<number | null>(null),
      gameActiveRef: ref(true),
      letterGridRef: ref(null),
      onShowResultsRef: ref(onShow),
      setGameActive: vi.fn(),
      setWaitingForResults: vi.fn(),
      setShowWordFeedback: vi.fn(),
      setWordToVote: vi.fn(),
    });
    handlers.handleValidatedScores({ scores: [{ username: 'Ann', score: 9 }] as never, letterGrid: [], gameMode: 'wheel-rush' } as never);
    expect(onShow).toHaveBeenCalledWith(expect.objectContaining({ gameMode: 'wheel-rush' }));
  });

  it('the results props carry it through', () => {
    const props = buildMpResultsProps({
      gameCode: 'ABC123', username: 'Ann', isHost: false, socket: null, roomLanguage: 'en',
      isClassroomMode: false, classroomGameMode: undefined, onExitToLobby: vi.fn(),
      resultsData: { scores: [], letterGrid: [], gameMode: 'blast' } as never,
      handleReturnToRoom: vi.fn(), gameDuration: 90,
      seriesTracker: { standings: [], roundNumber: 1, totalGames: 3, seriesLeader: null, reset: vi.fn() } as never,
    } as never);
    expect(props.gameMode).toBe('blast');
  });
});
