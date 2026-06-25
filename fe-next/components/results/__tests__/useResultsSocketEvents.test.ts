/**
 * useResultsSocketEvents Tests
 *
 * Tests for the results page socket events hook
 * Following TDD: Tests written to verify hook behavior
 */

import { renderHook, act } from '@testing-library/react';
import { useResultsSocketEvents } from '../useResultsSocketEvents';
import type { Socket } from 'socket.io-client';

// Mock logger to prevent console output during tests
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock LanguageContext
const mockT = vi.fn((key: string) => key);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT }),
}));

// Mock EnhancedToast showToast
const mockShowToast = vi.fn();
vi.mock('@/components/ui/EnhancedToast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

// ==============================================
// TEST FIXTURES
// ==============================================

interface MockSocket {
  listeners: Record<string, Array<(...args: unknown[]) => void>>;
  connected: boolean;
  emit: vi.Mock;
  on: vi.Mock;
  off: vi.Mock;
}

function createMockSocket(): MockSocket {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  return {
    listeners,
    connected: true,
    emit: vi.fn(),
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
      return {} as unknown;
    }),
    off: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      }
      return {} as unknown;
    }),
  };
}

function triggerSocketEvent(
  mockSocket: ReturnType<typeof createMockSocket>,
  event: string,
  data: unknown
) {
  const callbacks = mockSocket.listeners[event] || [];
  callbacks.forEach((callback) => callback(data));
}

// ==============================================
// TESTS
// ==============================================

describe('useResultsSocketEvents', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket = createMockSocket();
    vi.clearAllMocks();
    mockShowToast.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // The dictionary-building modal is intentionally delayed ~10s before it shows.
  const advanceWordFeedbackDelay = () => {
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
  };

  describe('Initialization', () => {
    it('should return initial state with all values set to defaults', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // THEN
      expect(result.current.showWordFeedback).toBe(false);
      expect(result.current.wordToVote).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.xpGainedData).toBeNull();
      expect(result.current.levelUpData).toBeNull();
      expect(result.current.showLevelUpCelebration).toBe(false);
      expect(result.current.nearMisses).toEqual([]);
      expect(result.current.referralMilestone).toBeNull();
      expect(result.current.showReferralMilestone).toBe(false);
      expect(result.current.readyUsernames).toEqual([]);
      expect(result.current.isCurrentPlayerReady).toBe(false);
    });

    it('should handle null socket gracefully', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: null })
      );

      // THEN - Should not throw and return default state
      expect(result.current.showWordFeedback).toBe(false);
      expect(result.current.isCurrentPlayerReady).toBe(false);
    });
  });

  describe('Socket Event Listeners', () => {
    it('should register all required socket event listeners', () => {
      // GIVEN/WHEN
      renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // THEN
      expect(mockSocket.on).toHaveBeenCalledWith(
        'showWordFeedback',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'voteRecorded',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'xpGained',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'levelUp',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'engagement:nearMisses',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'engagement:referralMilestone',
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'playersReadyUpdate',
        expect.any(Function)
      );
    });

    it('should emit getPlayersReadyCount on mount', () => {
      // GIVEN/WHEN
      renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // THEN
      expect(mockSocket.emit).toHaveBeenCalledWith('getPlayersReadyCount');
    });

    it('should cleanup listeners on unmount', () => {
      // GIVEN
      const { unmount } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // WHEN
      unmount();

      // THEN
      expect(mockSocket.off).toHaveBeenCalledWith(
        'showWordFeedback',
        expect.any(Function)
      );
      expect(mockSocket.off).toHaveBeenCalledWith(
        'xpGained',
        expect.any(Function)
      );
      expect(mockSocket.off).toHaveBeenCalledWith(
        'levelUp',
        expect.any(Function)
      );
      expect(mockSocket.off).toHaveBeenCalledWith(
        'playersReadyUpdate',
        expect.any(Function)
      );
    });
  });

  describe('Word Feedback Events', () => {
    it('should update state when showWordFeedback event is received (after delay)', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'showWordFeedback', {
          word: 'HELLO',
          submittedBy: 'testUser',
          submitterAvatar: { emoji: '🎮', color: '#FF0000' },
          timeoutSeconds: 15,
          gameCode: 'ABC123',
          language: 'en',
        });
      });
      advanceWordFeedbackDelay();

      // THEN
      expect(result.current.showWordFeedback).toBe(true);
      expect(result.current.wordToVote).toEqual({
        word: 'HELLO',
        submittedBy: 'testUser',
        submitterAvatar: { emoji: '🎮', color: '#FF0000' },
        voteInfo: undefined,
        timeoutSeconds: 15,
        gameCode: 'ABC123',
        language: 'en',
      });
    });

    it('should NOT show the modal until the ~10s delay has elapsed', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'showWordFeedback', {
          word: 'HELLO',
          submittedBy: 'testUser',
          gameCode: 'ABC123',
          language: 'en',
        });
      });

      // THEN - still hidden right after the event
      expect(result.current.showWordFeedback).toBe(false);
      expect(result.current.wordToVote).toBeNull();

      // WHEN - not quite enough time has passed
      act(() => {
        vi.advanceTimersByTime(9_000);
      });

      // THEN - still hidden
      expect(result.current.showWordFeedback).toBe(false);

      // WHEN - the full delay elapses
      act(() => {
        vi.advanceTimersByTime(1_000);
      });

      // THEN - now visible
      expect(result.current.showWordFeedback).toBe(true);
    });

    it('should only show word feedback once per results page', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // WHEN - first event shows the modal, then the user skips it
      act(() => {
        triggerSocketEvent(mockSocket, 'showWordFeedback', {
          word: 'HELLO',
          submittedBy: 'testUser',
          gameCode: 'ABC123',
          language: 'en',
        });
      });
      advanceWordFeedbackDelay();
      expect(result.current.showWordFeedback).toBe(true);

      act(() => {
        result.current.handleFeedbackSkip();
      });
      expect(result.current.showWordFeedback).toBe(false);

      // WHEN - a second event arrives later
      act(() => {
        triggerSocketEvent(mockSocket, 'showWordFeedback', {
          word: 'WORLD',
          submittedBy: 'otherUser',
          gameCode: 'ABC123',
          language: 'en',
        });
      });
      advanceWordFeedbackDelay();

      // THEN - it must not re-appear
      expect(result.current.showWordFeedback).toBe(false);
      expect(result.current.wordToVote).toBeNull();
    });

    it('should limit word queue to 2 items', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'showWordFeedback', {
          word: 'HELLO',
          submittedBy: 'testUser',
          gameCode: 'ABC123',
          language: 'en',
          wordQueue: [
            { word: 'WORD1', submittedBy: 'user1' },
            { word: 'WORD2', submittedBy: 'user2' },
            { word: 'WORD3', submittedBy: 'user3' },
            { word: 'WORD4', submittedBy: 'user4' },
          ],
        });
      });
      advanceWordFeedbackDelay();

      // THEN - Queue should be limited to 2
      expect(result.current.wordQueue).toHaveLength(2);
      expect(result.current.wordQueue[0].word).toBe('WORD1');
      expect(result.current.wordQueue[1].word).toBe('WORD2');
    });

    it('should transform voteInfo correctly when using votesFor/votesAgainst format', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'showWordFeedback', {
          word: 'TEST',
          submittedBy: 'user',
          voteInfo: { votesFor: 5, votesAgainst: 2 },
          gameCode: 'ABC123',
          language: 'en',
        });
      });
      advanceWordFeedbackDelay();

      // THEN
      expect(result.current.wordToVote?.voteInfo).toEqual({
        approvalCount: 5,
        disapprovalCount: 2,
      });
    });
  });

  describe('XP and Level Events', () => {
    it('should update xpGainedData when xpGained event is received', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      const xpData = {
        xpGained: 100,
        newTotalXp: 1500,
        xpBreakdown: { baseXp: 50, bonusXp: 50 },
      };

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'xpGained', xpData);
      });

      // THEN
      expect(result.current.xpGainedData).toEqual(xpData);
    });

    it('should update levelUpData and show celebration when levelUp event is received', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      const levelUpData = {
        newLevel: 10,
        previousLevel: 9,
        rewards: ['New Avatar'],
      };

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'levelUp', levelUpData);
      });

      // THEN
      expect(result.current.levelUpData).toEqual(levelUpData);
      expect(result.current.showLevelUpCelebration).toBe(true);
    });
  });

  describe('Near Miss Events', () => {
    it('should update nearMisses when engagement:nearMisses event is received', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      const nearMissData = {
        nearMisses: [
          { type: 'streak', current: 4, target: 5, remaining: 1, message: 'Almost there!' },
          { type: 'score', current: 90, target: 100, remaining: 10, message: 'So close!' },
        ],
      };

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'engagement:nearMisses', nearMissData);
      });

      // THEN
      expect(result.current.nearMisses).toHaveLength(2);
      expect(result.current.nearMisses[0].message).toBe('Almost there!');
    });

    it('should not update nearMisses when array is empty', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'engagement:nearMisses', {
          nearMisses: [],
        });
      });

      // THEN
      expect(result.current.nearMisses).toEqual([]);
    });
  });

  describe('Referral Milestone Events', () => {
    it('should show referral milestone when engagement:referralMilestone event is received', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
      );

      const milestoneData = {
        milestone: {
          level: 5,
          reward: 'Premium Avatar',
          referralCount: 10,
        },
      };

      // WHEN
      act(() => {
        triggerSocketEvent(
          mockSocket,
          'engagement:referralMilestone',
          milestoneData
        );
      });

      // THEN
      expect(result.current.referralMilestone).toEqual(milestoneData.milestone);
      expect(result.current.showReferralMilestone).toBe(true);
    });
  });

  describe('Players Ready Events', () => {
    it('should update readyUsernames when playersReadyUpdate event is received with usernames array', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({
          socket: mockSocket as unknown as Socket,
          username: 'currentUser',
        })
      );

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'playersReadyUpdate', {
          readyCount: 3,
          totalPlayers: 5,
          readyUsernames: ['user1', 'user2', 'currentUser'],
        });
      });

      // THEN
      expect(result.current.readyUsernames).toEqual([
        'user1',
        'user2',
        'currentUser',
      ]);
      expect(result.current.isCurrentPlayerReady).toBe(true);
    });

    it('should add username to readyUsernames when playersReadyUpdate event has single username', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({
          socket: mockSocket as unknown as Socket,
          username: 'currentUser',
        })
      );

      // WHEN
      act(() => {
        triggerSocketEvent(mockSocket, 'playersReadyUpdate', {
          readyCount: 1,
          totalPlayers: 5,
          username: 'otherUser',
        });
      });

      // THEN
      expect(result.current.readyUsernames).toContain('otherUser');
    });

    it('should not add duplicate usernames', () => {
      // GIVEN
      const { result } = renderHook(() =>
        useResultsSocketEvents({
          socket: mockSocket as unknown as Socket,
          username: 'currentUser',
        })
      );

      // WHEN - Add same user twice
      act(() => {
        triggerSocketEvent(mockSocket, 'playersReadyUpdate', {
          readyCount: 1,
          totalPlayers: 5,
          username: 'otherUser',
        });
      });

      act(() => {
        triggerSocketEvent(mockSocket, 'playersReadyUpdate', {
          readyCount: 1,
          totalPlayers: 5,
          username: 'otherUser',
        });
      });

      // THEN - Should only have one entry
      expect(
        result.current.readyUsernames.filter((u) => u === 'otherUser')
      ).toHaveLength(1);
    });
  });

  describe('Action Handlers', () => {
    describe('handleVote', () => {
      it('should emit submitWordVote when called with valid state', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // Set up word to vote
        act(() => {
          triggerSocketEvent(mockSocket, 'showWordFeedback', {
            word: 'HELLO',
            submittedBy: 'testUser',
            gameCode: 'ABC123',
            language: 'en',
          });
        });
        advanceWordFeedbackDelay();

        // WHEN
        act(() => {
          result.current.handleVote('like');
        });

        // THEN
        expect(mockSocket.emit).toHaveBeenCalledWith('submitWordVote', {
          word: 'HELLO',
          language: 'en',
          gameCode: 'ABC123',
          voteType: 'like',
          submittedBy: 'testUser',
        });
      });

      it('should not emit when no wordToVote exists', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        const emitCallCountBefore = mockSocket.emit.mock.calls.length;

        // WHEN
        act(() => {
          result.current.handleVote('like');
        });

        // THEN - Only getPlayersReadyCount should have been emitted
        expect(mockSocket.emit).toHaveBeenCalledTimes(emitCallCountBefore);
      });
    });

    describe('handleFeedbackSkip', () => {
      it('should clear word feedback state', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // Set up word feedback
        act(() => {
          triggerSocketEvent(mockSocket, 'showWordFeedback', {
            word: 'HELLO',
            submittedBy: 'testUser',
            gameCode: 'ABC123',
            language: 'en',
          });
        });
        advanceWordFeedbackDelay();

        expect(result.current.showWordFeedback).toBe(true);

        // WHEN
        act(() => {
          result.current.handleFeedbackSkip();
        });

        // THEN
        expect(result.current.showWordFeedback).toBe(false);
        expect(result.current.wordToVote).toBeNull();
        expect(result.current.wordQueue).toEqual([]);
      });
    });

    describe('handleReferralMilestoneClose', () => {
      it('should hide referral milestone popup and clear data', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // Show referral milestone
        act(() => {
          triggerSocketEvent(mockSocket, 'engagement:referralMilestone', {
            milestone: { level: 5, reward: 'Avatar' },
          });
        });

        expect(result.current.showReferralMilestone).toBe(true);

        // WHEN
        act(() => {
          result.current.handleReferralMilestoneClose();
        });

        // THEN
        expect(result.current.showReferralMilestone).toBe(false);
        expect(result.current.referralMilestone).toBeNull();
      });
    });

    describe('handleMarkReady', () => {
      it('should emit confirmReadyForNextGame and update state', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // WHEN
        act(() => {
          result.current.handleMarkReady();
        });

        // THEN
        expect(mockSocket.emit).toHaveBeenCalledWith('confirmReadyForNextGame');
        expect(result.current.isCurrentPlayerReady).toBe(true);
      });

      it('should not emit when already ready', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // Mark ready first time
        act(() => {
          result.current.handleMarkReady();
        });

        const emitCallCount = mockSocket.emit.mock.calls.filter(
          (call) => call[0] === 'confirmReadyForNextGame'
        ).length;

        // WHEN - Try to mark ready again
        act(() => {
          result.current.handleMarkReady();
        });

        // THEN - Should not emit again
        const newEmitCallCount = mockSocket.emit.mock.calls.filter(
          (call) => call[0] === 'confirmReadyForNextGame'
        ).length;
        expect(newEmitCallCount).toBe(emitCallCount);
      });

      it('should not emit when socket is null', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useResultsSocketEvents({ socket: null })
        );

        // WHEN
        act(() => {
          result.current.handleMarkReady();
        });

        // THEN - Should not throw and state should remain false
        expect(result.current.isCurrentPlayerReady).toBe(false);
      });
    });

    describe('One More Game prompt', () => {
      it('should show toast with prompt title and message when engagement:oneMoreGame is received', () => {
        // GIVEN
        renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // WHEN
        act(() => {
          triggerSocketEvent(mockSocket, 'engagement:oneMoreGame', {
            prompt: {
              title: 'Keep Going!',
              message: 'You were on fire — play again!',
              incentive: '+50 XP',
            },
          });
        });

        // THEN
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            title: 'Keep Going!',
            message: 'You were on fire — play again!',
          })
        );
      });

      it('should use fallback translation keys when prompt title/message are empty', () => {
        // GIVEN
        renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // WHEN
        act(() => {
          triggerSocketEvent(mockSocket, 'engagement:oneMoreGame', {
            prompt: {
              title: '',
              message: '',
              incentive: '+25 XP',
            },
          });
        });

        // THEN
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'info',
            title: 'oneMoreGame.defaultTitle',
            message: 'oneMoreGame.defaultMessage',
          })
        );
      });

      it('should not show toast when prompt is missing', () => {
        // GIVEN
        renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // WHEN
        act(() => {
          triggerSocketEvent(mockSocket, 'engagement:oneMoreGame', { prompt: null });
        });

        // THEN
        expect(mockShowToast).not.toHaveBeenCalled();
      });

      it('should register engagement:oneMoreGame listener on mount', () => {
        // GIVEN/WHEN
        renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // THEN
        expect(mockSocket.on).toHaveBeenCalledWith(
          'engagement:oneMoreGame',
          expect.any(Function)
        );
      });

      it('should unregister engagement:oneMoreGame listener on unmount', () => {
        // GIVEN
        const { unmount } = renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // WHEN
        unmount();

        // THEN
        expect(mockSocket.off).toHaveBeenCalledWith(
          'engagement:oneMoreGame',
          expect.any(Function)
        );
      });
    });

    describe('setShowLevelUpCelebration', () => {
      it('should update showLevelUpCelebration state', () => {
        // GIVEN
        const { result } = renderHook(() =>
          useResultsSocketEvents({ socket: mockSocket as unknown as Socket })
        );

        // WHEN
        act(() => {
          result.current.setShowLevelUpCelebration(true);
        });

        // THEN
        expect(result.current.showLevelUpCelebration).toBe(true);

        // WHEN
        act(() => {
          result.current.setShowLevelUpCelebration(false);
        });

        // THEN
        expect(result.current.showLevelUpCelebration).toBe(false);
      });
    });
  });
});
