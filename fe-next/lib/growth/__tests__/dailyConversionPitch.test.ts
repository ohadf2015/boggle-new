import { describe, it, expect } from 'vitest';
import {
  selectDailyConversionPitch,
  CLOSE_LOSS_POINTS,
  type DailyPitchInput,
} from '../dailyConversionPitch';

const base: DailyPitchInput = {
  hasPlayedToday: false,
  currentStreak: 0,
  missedDays: 0,
  isWinner: false,
  marginToNext: null,
  isOnCrazyGames: false,
};

describe('selectDailyConversionPitch', () => {
  it('suppresses (null) when already played today', () => {
    expect(selectDailyConversionPitch({ ...base, hasPlayedToday: true, currentStreak: 5 })).toBeNull();
  });

  it('streak_at_risk wins over a win when streak is alive', () => {
    const pitch = selectDailyConversionPitch({ ...base, currentStreak: 6, isWinner: true });
    expect(pitch?.variant).toBe('streak_at_risk');
    expect(pitch?.accent).toBe('orange');
    expect(pitch?.showCountdown).toBe(true);
  });

  it('catchup fires when streak is 0 and a recent day was missed', () => {
    const pitch = selectDailyConversionPitch({ ...base, missedDays: 1 });
    expect(pitch?.variant).toBe('catchup');
    expect(pitch?.showCountdown).toBe(true);
  });

  it('an alive streak overrides catchup', () => {
    const pitch = selectDailyConversionPitch({ ...base, currentStreak: 2, missedDays: 1 });
    expect(pitch?.variant).toBe('streak_at_risk');
  });

  it('win_momentum fires only when winner with no streak and no missed days', () => {
    const pitch = selectDailyConversionPitch({ ...base, isWinner: true });
    expect(pitch?.variant).toBe('win_momentum');
    expect(pitch?.accent).toBe('yellow');
    expect(pitch?.showCountdown).toBe(false);
  });

  it('close_loss fires for a near-miss loss within the threshold', () => {
    const pitch = selectDailyConversionPitch({ ...base, marginToNext: CLOSE_LOSS_POINTS - 1 });
    expect(pitch?.variant).toBe('close_loss');
    expect(pitch?.accent).toBe('cyan');
  });

  it('loss_redirect fires for a blowout loss beyond the threshold', () => {
    const pitch = selectDailyConversionPitch({ ...base, marginToNext: CLOSE_LOSS_POINTS + 25 });
    expect(pitch?.variant).toBe('loss_redirect');
  });

  it('unknown placement (null margin) never picks close_loss', () => {
    const pitch = selectDailyConversionPitch({ ...base, marginToNext: null });
    expect(pitch?.variant).toBe('loss_redirect');
  });

  it('returns i18n keys, never literal English', () => {
    const pitch = selectDailyConversionPitch({ ...base, isWinner: true });
    expect(pitch?.titleKey.startsWith('dailyInvite.')).toBe(true);
    expect(pitch?.bodyKey.startsWith('dailyInvite.')).toBe(true);
    expect(pitch?.ctaKey).toBe('dailyInvite.playNow');
  });

  it('on CrazyGames the body swaps to the come-back key but keeps the analytics variant', () => {
    const pitch = selectDailyConversionPitch({ ...base, isWinner: true, isOnCrazyGames: true });
    expect(pitch?.variant).toBe('win_momentum');
    expect(pitch?.bodyKey).toBe('dailyInvite.bodyCgComeBack');
  });
});
