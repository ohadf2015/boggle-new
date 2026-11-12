import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackGameStart = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...a: unknown[]) => trackGameStart(...a),
  trackGameEnd: vi.fn(),
}));
vi.mock('@/utils/authFetch', () => ({ getWithAuth: () => Promise.resolve({ ok: false }) }));
vi.mock('@/utils/guestManager', () => ({ getGuestFingerprint: () => null }));

import { emptySave, saveDailyTower } from '@/lib/wordTowerV2/dailyTower';
import { useV2Ready } from '../useV2Ready';

const args = (daily: boolean) => ({
  daily,
  isAdmin: false,
  canSeeInWorkModes: false,
  language: 'he',
  phase: 'composing',
  floors: 0,
  peakM: 0,
  heightM: 0,
  score: 0,
  resultsShown: false,
  seedDemo: vi.fn(),
  setForceResults: vi.fn(),
  setSmashing: vi.fn(),
});

describe('useV2Ready start telemetry: reopened daily tower', () => {
  beforeEach(() => {
    trackGameStart.mockClear();
    window.localStorage.clear();
  });
  afterEach(() => window.localStorage.clear());

  it('marks the start when a saved daily tower is restored', () => {
    saveDailyTower({ ...emptySave('he'), words: ['שלום', 'מים'] }, window.localStorage);
    renderHook(() => useV2Ready(args(true)));
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart.mock.calls[0][1]).toMatchObject({ daily: true, daily_restored: true });
  });

  it('marks a first daily visit as not restored', () => {
    renderHook(() => useV2Ready(args(true)));
    expect(trackGameStart.mock.calls[0][1]).toMatchObject({ daily: true, daily_restored: false });
  });

  it('leaves free runs without the flag', () => {
    saveDailyTower({ ...emptySave('he'), words: ['שלום'] }, window.localStorage);
    renderHook(() => useV2Ready(args(false)));
    expect(trackGameStart.mock.calls[0][1]).not.toHaveProperty('daily_restored');
  });
});
