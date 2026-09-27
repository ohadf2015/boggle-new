/**
 * Tests for useCreatorNotifications hook
 * TDD: RED phase — tests written before implementation
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useCreatorNotifications } from '../useCreatorNotifications';

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(
    vi.fn(),
    {
      success: vi.fn(),
    }
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (!vars) return key;
      const parts = Object.entries(vars).map(([k, v]) => `${k}=${String(v)}`);
      return `${key} ${parts.join(' ')}`;
    },
  }),
}));

const toastMock = toast as any;

describe('useCreatorNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('notifyBoardPlayed calls toast.success with coins in message', () => {
    const { result } = renderHook(() => useCreatorNotifications());
    result.current.notifyBoardPlayed('Alice', 'My Board', 5);
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining('5'),
      expect.objectContaining({ duration: 4000, icon: '🎮' })
    );
  });

  it('notifyBoardRated calls toast.success with coins in message', () => {
    const { result } = renderHook(() => useCreatorNotifications());
    result.current.notifyBoardRated(10);
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining('10'),
      expect.objectContaining({ duration: 3000, icon: '⭐' })
    );
  });

  it('notifyMilestone calls toast.success with count and coins in message', () => {
    const { result } = renderHook(() => useCreatorNotifications());
    result.current.notifyMilestone(100, 50);
    expect(toastMock.success).toHaveBeenCalledWith(
      expect.stringContaining('100'),
      expect.objectContaining({ duration: 5000, icon: '🎉' })
    );
  });

  it('notifyHighScoreBeat calls toast with board title in message', () => {
    const { result } = renderHook(() => useCreatorNotifications());
    result.current.notifyHighScoreBeat('My Awesome Board');
    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining('My Awesome Board'),
      expect.objectContaining({ duration: 4000, icon: '🏆' })
    );
  });
});
