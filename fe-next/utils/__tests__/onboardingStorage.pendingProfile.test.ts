/**
 * savePendingOnboardingProfile — persists in-progress FTUE identity (name +
 * avatar id + edited flag) so a mid-onboarding OAuth signup carries it into
 * createNewProfile, WITHOUT marking onboarding complete.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePendingOnboardingProfile,
  getOnboardingData,
  hasCompletedOnboarding,
  isFirstTimeUser,
  markOnboardingComplete,
} from '@/utils/onboardingStorage';

describe('savePendingOnboardingProfile', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists displayName, avatarId and nameEdited into the onboarding blob', () => {
    savePendingOnboardingProfile({ displayName: 'Zelda', avatarId: 'custom', nameEdited: true });

    const data = getOnboardingData();
    expect(data?.displayName).toBe('Zelda');
    expect(data?.avatarId).toBe('custom');
    expect(data?.nameEdited).toBe(true);
  });

  it('does NOT mark onboarding complete (abandon-safe)', () => {
    savePendingOnboardingProfile({ displayName: 'Link', avatarId: 'custom', nameEdited: false });

    expect(hasCompletedOnboarding()).toBe(false);
    expect(isFirstTimeUser()).toBe(true);
  });

  it('preserves an existing selectedMode/completedAt when re-saving', () => {
    markOnboardingComplete({ avatarId: 'a1', displayName: 'Old', selectedMode: 'multi' });
    const before = getOnboardingData();
    expect(before?.selectedMode).toBe('multi');

    savePendingOnboardingProfile({ displayName: 'New', avatarId: 'custom', nameEdited: true });

    const after = getOnboardingData();
    expect(after?.displayName).toBe('New');
    expect(after?.avatarId).toBe('custom');
    expect(after?.nameEdited).toBe(true);
    expect(after?.selectedMode).toBe('multi'); // carried over, not clobbered
    expect(after?.completedAt).toBe(before?.completedAt);
  });
});
