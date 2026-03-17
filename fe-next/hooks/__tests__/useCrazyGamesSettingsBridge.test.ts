'use client';

import { renderHook, act } from '@testing-library/react';

// Mock Howler
const mockHowlerMute = jest.fn();
jest.mock('howler', () => ({
  Howler: { mute: (val: boolean) => mockHowlerMute(val) },
}));

// Mock useCrazyGamesSettings
const mockSettings = {
  shouldMuteAudio: false,
  shouldDisableChat: false,
  isReady: true,
};
jest.mock('@/hooks/useCrazyGamesSettings', () => ({
  useCrazyGamesSettings: () => mockSettings,
}));

import { useCrazyGamesChatDisabled } from '@/hooks/useCrazyGamesSettingsBridge';

describe('CrazyGamesSettingsBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
