/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PostRoundSummary } from '../PostRoundSummary';
import { midRoundEventQueueStore } from '@/hooks/useMidRoundEventQueue';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'multiplayer.postRound.title': 'During your round',
        'multiplayer.postRound.joined': `${params?.count ?? 0} joined`,
        'multiplayer.postRound.left': `${params?.count ?? 0} left`,
        'multiplayer.postRound.achievements': `${params?.count ?? 0} achievements`,
        'common.dismiss': 'Dismiss',
      };
      return map[key] ?? key;
    },
    dir: 'ltr',
  }),
}));

describe('PostRoundSummary', () => {
  beforeEach(() => {
    act(() => midRoundEventQueueStore.getState().clear());
  });

  it('renders nothing when queue is empty', () => {
    const { container } = render(<PostRoundSummary />);
    expect(container.firstChild).toBeNull();
  });

  it('renders join + leave + achievement chips and drains queue on mount', () => {
    act(() => {
      const enq = midRoundEventQueueStore.getState().enqueue;
      enq({ kind: 'playerJoined', payload: { username: 'Bob', isBot: false } });
      enq({ kind: 'playerJoined', payload: { username: 'Bot-1', isBot: true } });
      enq({ kind: 'playerLeft', payload: { username: 'Carol' } });
      enq({ kind: 'achievementUnlocked', payload: { key: 'FIRST_BLOOD', icon: '🎯' } });
      enq({ kind: 'achievementUnlocked', payload: { key: 'WORD_MASTER', icon: '📚' } });
    });

    render(<PostRoundSummary />);

    expect(screen.getByText(/2 joined/)).toBeTruthy();
    expect(screen.getByText(/1 left/)).toBeTruthy();
    expect(screen.getByText(/2 achievements/)).toBeTruthy();

    // Queue drained → next mount renders nothing
    expect(midRoundEventQueueStore.getState().events).toEqual([]);
  });

  it('does not double-drain on remount (snapshot was already consumed)', () => {
    act(() => {
      midRoundEventQueueStore
        .getState()
        .enqueue({ kind: 'playerJoined', payload: { username: 'Bob' } });
    });

    const { unmount } = render(<PostRoundSummary />);
    expect(screen.queryByText(/1 joined/)).toBeTruthy();
    unmount();

    // Queue should already be empty; remount sees nothing
    const { container } = render(<PostRoundSummary />);
    expect(container.firstChild).toBeNull();
  });
});
