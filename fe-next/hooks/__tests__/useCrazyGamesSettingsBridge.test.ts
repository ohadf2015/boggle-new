'use client';

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Howler
const { mockHowlerMute } = vi.hoisted(() => {
  const mockHowlerMute = vi.fn();
  return { mockHowlerMute };
});
vi.mock('howler', () => ({
  Howler: { mute: (val: boolean) => mockHowlerMute(val) },
}));

// Mock useCrazyGamesSettings
const mockSettings = {
  shouldMuteAudio: false,
  shouldDisableChat: false,
  isReady: true,
};
vi.mock('@/hooks/useCrazyGamesSettings', () => ({
  useCrazyGamesSettings: () => mockSettings,
}));

import { useCrazyGamesChatDisabled } from '@/hooks/useCrazyGamesSettingsBridge';

describe('CrazyGamesSettingsBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.shouldMuteAudio = false;
    mockSettings.shouldDisableChat = false;
    mockSettings.isReady = true;
  });

  describe('useCrazyGamesChatDisabled', () => {
    it('returns false when chat is not disabled', () => {
      const { result } = renderHook(() => useCrazyGamesChatDisabled());
      expect(result.current).toBe(false);
    });

    it('returns true when CrazyGames disables chat', () => {
      mockSettings.shouldDisableChat = true;
      const { result } = renderHook(() => useCrazyGamesChatDisabled());
      expect(result.current).toBe(true);
    });
  });
});
