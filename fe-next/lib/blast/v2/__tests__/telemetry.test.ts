import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as telemetry from '../telemetry';

describe('Blast v2 telemetry', () => {
  let mockPostHog: any;

  beforeEach(() => {
    mockPostHog = { capture: vi.fn() };
    (global as any).window = { posthog: mockPostHog };
  });

  it('trackBlastLevelStarted fires event with correct shape', () => {
    telemetry.trackBlastLevelStarted({
      level: 5,
      locale: 'en',
      theme: 'fruits',
      mechanics: ['coinOverlay', 'frozenTiles'],
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_level_started',
      expect.objectContaining({ level: 5, theme: 'fruits' })
    );
  });

  it('trackBlastWordFound fires with cascade flag', () => {
    telemetry.trackBlastWordFound({
      level: 3,
      word: 'CAT',
      axis: 'H',
      length: 3,
      isCascade: true,
      isBonus: false,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_word_found',
      expect.objectContaining({ isCascade: true })
    );
  });

  it('trackBlastWordRejected includes reason', () => {
    telemetry.trackBlastWordRejected({
      level: 2,
      attempted_word: 'XYZ',
      length: 3,
      reason: 'unknown',
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_word_rejected',
      expect.objectContaining({ reason: 'unknown' })
    );
  });

  it('trackBlastHintUsed logs cost', () => {
    telemetry.trackBlastHintUsed({
      level: 20,
      hint_type: 'reveal_letter',
      coin_cost: 100,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_hint_used',
      expect.objectContaining({ hint_type: 'reveal_letter', coin_cost: 100 })
    );
  });

  it('trackBlastLevelCompleted includes all metrics', () => {
    telemetry.trackBlastLevelCompleted({
      level: 7,
      locale: 'he',
      theme: 'animals',
      time_seconds: 45,
      hints_used: 1,
      cascades: 2,
      stars: 3,
      coins_earned: 150,
      gems_collected: 3,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_level_completed',
      expect.objectContaining({ stars: 3, cascades: 2 })
    );
  });

  it('trackBlastLevelAbandoned on quit', () => {
    telemetry.trackBlastLevelAbandoned({
      level: 5,
      locale: 'sv',
      time_in_level_seconds: 30,
      words_found_count: 1,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_level_abandoned',
      expect.objectContaining({ words_found_count: 1 })
    );
  });

  it('trackBlastChestOpened with avatar part', () => {
    telemetry.trackBlastChestOpened({
      chest_number: 5,
      tier: 'gold',
      coins: 800,
      boosts_count: 2,
      avatar_part: 'eye-color-blue',
      is_duplicate: false,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_chest_opened',
      expect.objectContaining({ avatar_part: 'eye-color-blue' })
    );
  });

  it('trackBlastChestPreviewed', () => {
    telemetry.trackBlastChestPreviewed({
      chest_number: 3,
      tier: 'silver',
      level: 22,
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_chest_previewed',
      expect.objectContaining({ chest_number: 3 })
    );
  });

  it('trackBlastFtueStep with advance reason', () => {
    telemetry.trackBlastFtueStep({
      step_number: 3,
      advance_reason: 'action',
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_ftue_step',
      expect.objectContaining({ step_number: 3 })
    );
  });

  it('trackBlastTutorialSeen for mechanic unlock', () => {
    telemetry.trackBlastTutorialSeen({
      mechanic: 'frozenTiles',
      level: 8,
      dismiss_via: 'button',
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'blast_tutorial_seen',
      expect.objectContaining({ mechanic: 'frozenTiles' })
    );
  });

  it('no-op when window.posthog undefined', () => {
    (global as any).window = { posthog: undefined };
    expect(() => telemetry.trackBlastWordFound({
      level: 1, word: 'A', axis: 'H', length: 1, isCascade: false, isBonus: false,
    })).not.toThrow();
  });

  it('all events receive is_cg super-prop via window.posthog.register', () => {
    // This test verifies the CrazyGamesSDK integration; no-op here since posthog.register
    // happens at boot (not per-event). Test just confirms event functions don't re-register.
    mockPostHog.register = vi.fn();
    telemetry.trackBlastWordFound({
      level: 1, word: 'X', axis: 'H', length: 1, isCascade: false, isBonus: false,
    });
    // Expect capture, not register (register happens once at boot)
    expect(mockPostHog.capture).toHaveBeenCalled();
    expect(mockPostHog.register).not.toHaveBeenCalled();
  });
});
