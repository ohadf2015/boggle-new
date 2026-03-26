import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '@/hooks/gameState/store';
import { useMultiplayerEventNotifications } from '../useMultiplayerEventNotifications';
import { neoWarningToast, neoErrorToast, neoInfoToast } from '@/components/NeoToast';

vi.mock('@/components/NeoToast', () => ({
  neoWarningToast: vi.fn(),
  neoErrorToast: vi.fn(),
  neoInfoToast: vi.fn(),
  neoSuccessToast: vi.fn(),
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'multiplayer.playerEliminated': 'has been eliminated!',
    'multiplayer.youEliminated': 'You have been eliminated!',
    'multiplayer.playerLastLife': 'is on their last life!',
    'multiplayer.yourLastLife': 'FINAL LIFE!',
  };
  return translations[key] || key;
};

describe('useMultiplayerEventNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({
      wordHuntEliminatedPlayers: [],
      wordHuntPlayerLives: {},
      wordHuntMyLife: 100,
    });
  });

  describe('elimination notifications', () => {
    it('should show elimination toast when another player is eliminated', () => {
      const { rerender } = renderHook(
        ({ eliminated }) => {
          useGameStore.setState({ wordHuntEliminatedPlayers: eliminated });
          return useMultiplayerEventNotifications({ currentUsername: 'Alice', t: mockT, enabled: true });
        },
        { initialProps: { eliminated: [] as string[] } }
      );

      rerender({ eliminated: ['Bob'] });

      expect(neoWarningToast).toHaveBeenCalledWith(
        'Bob has been eliminated!',
        expect.objectContaining({ duration: expect.any(Number) })
      );
    });

    it('should show dramatic self-elimination toast', () => {
      const { rerender } = renderHook(
        ({ eliminated }) => {
          useGameStore.setState({ wordHuntEliminatedPlayers: eliminated });
          return useMultiplayerEventNotifications({ currentUsername: 'Alice', t: mockT, enabled: true });
        },
        { initialProps: { eliminated: [] as string[] } }
      );

      rerender({ eliminated: ['Alice'] });

      expect(neoErrorToast).toHaveBeenCalledWith(
        'You have been eliminated!',
        expect.objectContaining({ duration: expect.any(Number) })
      );
    });

    it('should not duplicate notifications for already-notified eliminations', () => {
      const { rerender } = renderHook(
        ({ eliminated }) => {
          useGameStore.setState({ wordHuntEliminatedPlayers: eliminated });
          return useMultiplayerEventNotifications({ currentUsername: 'Alice', t: mockT, enabled: true });
        },
        { initialProps: { eliminated: ['Bob'] as string[] } }
      );

      // Bob was already eliminated on mount — no notification
      expect(neoWarningToast).not.toHaveBeenCalled();

      // Re-render with same list — still no notification
      rerender({ eliminated: ['Bob'] });
      expect(neoWarningToast).not.toHaveBeenCalled();
    });

    it('should handle multiple eliminations', () => {
      const { rerender } = renderHook(
        ({ eliminated }) => {
          useGameStore.setState({ wordHuntEliminatedPlayers: eliminated });
          return useMultiplayerEventNotifications({ currentUsername: 'Alice', t: mockT, enabled: true });
        },
        { initialProps: { eliminated: [] as string[] } }
      );

      rerender({ eliminated: ['Bob', 'Charlie'] });

      expect(neoWarningToast).toHaveBeenCalledTimes(2);
    });
  });

  describe('last life warnings', () => {
    it('should show warning when another player reaches last life', () => {
      const { rerender } = renderHook(
        ({ lives }) => {
          useGameStore.setState({ wordHuntPlayerLives: lives });
          return useMultiplayerEventNotifications({ currentUsername: 'Alice', t: mockT, enabled: true });
        },
        { initialProps: { lives: { Alice: 50, Bob: 30 } as Record<string, number> } }
      );

      rerender({ lives: { Alice: 50, Bob: 1 } });

      expect(neoWarningToast).toHaveBeenCalledWith(
        'Bob is on their last life!',
        expect.objectContaining({ duration: expect.any(Number) })
      );
    });

    it('should show dramatic self last-life warning', () => {
      const { rerender } = renderHook(
        ({ lives }) => {
          useGameStore.setState({ wordHuntPlayerLives: lives, wordHuntMyLife: lives.Alice ?? 100 });
          return useMultiplayerEventNotifications({ currentUsername: 'Alice', t: mockT, enabled: true });
        },
        { initialProps: { lives: { Alice: 30 } as Record<string, number> } }
      );

      rerender({ lives: { Alice: 1 } });

      expect(neoErrorToast).toHaveBeenCalledWith(
        'FINAL LIFE!',
        expect.objectContaining({ duration: expect.any(Number) })
      );
    });

    it('should not re-notify for same player at last life', () => {
      const { rerender } = renderHook(
        ({ lives }) => {
          useGameStore.setState({ wordHuntPlayerLives: lives });
          return useMultiplayerEventNotifications({ currentUsername: 'Alice', t: mockT, enabled: true });
        },
        { initialProps: { lives: { Bob: 1 } as Record<string, number> } }
      );

      // Bob already at 1 on mount — no notification (skip initial)
      // But also shouldn't fire again on rerender with same value
      rerender({ lives: { Bob: 1 } });
      expect(neoWarningToast).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should not fire notifications when disabled', () => {
      const { rerender } = renderHook(
        ({ eliminated }) => {
          useGameStore.setState({ wordHuntEliminatedPlayers: eliminated });
          return useMultiplayerEventNotifications({ currentUsername: 'Alice', t: mockT, enabled: false });
        },
        { initialProps: { eliminated: [] as string[] } }
      );

      rerender({ eliminated: ['Bob'] });

      expect(neoWarningToast).not.toHaveBeenCalled();
      expect(neoErrorToast).not.toHaveBeenCalled();
    });
  });
});
