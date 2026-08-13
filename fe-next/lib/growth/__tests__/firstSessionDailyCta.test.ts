import { describe, it, expect } from 'vitest';
import {
  selectFirstSessionDailyCta,
  FIRST_SESSION_DAILY_PATH,
  type FirstSessionDailyCtaInput,
} from '../firstSessionDailyCta';

const base: FirstSessionDailyCtaInput = {
  alreadyPlayedToday: false,
  isFirstSession: false,
};

describe('selectFirstSessionDailyCta', () => {
  it('shouldReturnAlreadyPlayedWhenDailyIsDoneToday', () => {
    // GIVEN the player already finished today's Daily
    // WHEN we select the post-practice CTA
    const cta = selectFirstSessionDailyCta({ ...base, alreadyPlayedToday: true, isFirstSession: true });

    // THEN we suppress navigation and keep the come-back hook
    expect(cta.variant).toBe('already_played');
    expect(cta.href).toBeNull();
    expect(cta.showComeBackHook).toBe(true);
    expect(cta.titleKey.startsWith('practiceResults.')).toBe(true);
    expect(cta.bodyKey.startsWith('practiceResults.')).toBe(true);
  });

  it('shouldPitchRealDailyWhenFirstSessionHasNotPlayedToday', () => {
    // GIVEN a brand-new first session that has not touched today's Daily
    // WHEN we select the post-practice CTA
    const cta = selectFirstSessionDailyCta({ alreadyPlayedToday: false, isFirstSession: true });

    // THEN we send them to the live Word Hunt Daily (not another practice mode)
    expect(cta.variant).toBe('first_session');
    expect(cta.href).toBe(`${FIRST_SESSION_DAILY_PATH}?from=first_game`);
    expect(cta.href).not.toContain('/practice/');
    expect(cta.showComeBackHook).toBe(true);
    expect(cta.titleKey).toBe('practiceResults.firstSessionDailyTitle');
    expect(cta.bodyKey).toBe('practiceResults.firstSessionDailyBody');
    expect(cta.ctaKey).toBe('practiceResults.firstSessionDailyCta');
  });

  it('shouldPitchRealDailyWhenReturningPlayerHasNotPlayedToday', () => {
    // GIVEN a returning practice player who still has today's Daily open
    // WHEN we select the post-practice CTA
    const cta = selectFirstSessionDailyCta({ alreadyPlayedToday: false, isFirstSession: false });

    // THEN the button that says Daily must actually open Daily
    expect(cta.variant).toBe('daily_open');
    expect(cta.href).toBe(`${FIRST_SESSION_DAILY_PATH}?from=practice_results`);
    expect(cta.href).not.toContain('/practice/');
    expect(cta.showComeBackHook).toBe(false);
    expect(cta.titleKey).toBe('practiceResults.wordHuntCta');
    expect(cta.ctaKey).toBe('practiceResults.wordHuntCta');
  });

  it('shouldPreferAlreadyPlayedOverFirstSession', () => {
    // GIVEN first-session AND already played
    // WHEN we select
    const cta = selectFirstSessionDailyCta({ alreadyPlayedToday: true, isFirstSession: true });

    // THEN already-played wins — do not re-open today's one-shot puzzle
    expect(cta.variant).toBe('already_played');
    expect(cta.href).toBeNull();
  });

  it('shouldReturnI18nKeysNeverLiteralEnglish', () => {
    // GIVEN every variant
    const variants = [
      selectFirstSessionDailyCta({ alreadyPlayedToday: true, isFirstSession: false }),
      selectFirstSessionDailyCta({ alreadyPlayedToday: false, isFirstSession: true }),
      selectFirstSessionDailyCta({ alreadyPlayedToday: false, isFirstSession: false }),
    ];

    // THEN every copy field is an i18n key
    for (const cta of variants) {
      expect(cta.titleKey).toMatch(/^practiceResults\./);
      expect(cta.bodyKey).toMatch(/^practiceResults\./);
      expect(cta.ctaKey).toMatch(/^practiceResults\./);
      expect(cta.comeBackKey).toMatch(/^practiceResults\./);
    }
  });
});
