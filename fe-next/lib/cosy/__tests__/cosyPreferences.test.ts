import { describe, it, expect } from 'vitest';
import { resolveCosyPreferences, type RawCosyInputs } from '../cosyPreferences';

/**
 * Baseline = a non-cosy player with everything at its default/neutral state.
 * Each test overrides only the fields it exercises.
 */
const baseline: RawCosyInputs = {
  cosyMode: false,
  reduceMotion: 'system',
  systemPrefersReducedMotion: false,
  disableFireRoundLights: false,
  disableEarthquakeEffects: false,
  useLargeLetters: false,
};

describe('resolveCosyPreferences', () => {
  describe('when cosy mode is OFF', () => {
    it('passes the calming flags through unchanged (false stays false)', () => {
      const eff = resolveCosyPreferences(baseline);
      expect(eff.cosyMode).toBe(false);
      expect(eff.shouldReduceMotion).toBe(false);
      expect(eff.disableFireRoundLights).toBe(false);
      expect(eff.disableEarthquakeEffects).toBe(false);
      expect(eff.largeLettersEnabled).toBe(false);
    });

    it('honors an explicit reduceMotion=true even without cosy', () => {
      const eff = resolveCosyPreferences({ ...baseline, reduceMotion: true });
      expect(eff.shouldReduceMotion).toBe(true);
    });

    it("resolves reduceMotion='system' to the system preference", () => {
      const off = resolveCosyPreferences({ ...baseline, systemPrefersReducedMotion: false });
      const on = resolveCosyPreferences({ ...baseline, systemPrefersReducedMotion: true });
      expect(off.shouldReduceMotion).toBe(false);
      expect(on.shouldReduceMotion).toBe(true);
    });

    it('preserves a user who already disabled individual effects', () => {
      const eff = resolveCosyPreferences({
        ...baseline,
        disableFireRoundLights: true,
        disableEarthquakeEffects: true,
        useLargeLetters: true,
      });
      expect(eff.disableFireRoundLights).toBe(true);
      expect(eff.disableEarthquakeEffects).toBe(true);
      expect(eff.largeLettersEnabled).toBe(true);
    });

    it('uses full celebrations and shows timer urgency', () => {
      const eff = resolveCosyPreferences(baseline);
      expect(eff.celebrationIntensity).toBe('full');
      expect(eff.suppressTimerUrgency).toBe(false);
    });
  });

  describe('when cosy mode is ON (OR-mask: can only add calm)', () => {
    const cosy = { ...baseline, cosyMode: true };

    it('forces every calming flag on even when the base value is off', () => {
      const eff = resolveCosyPreferences(cosy);
      expect(eff.cosyMode).toBe(true);
      expect(eff.shouldReduceMotion).toBe(true);
      expect(eff.disableFireRoundLights).toBe(true);
      expect(eff.disableEarthquakeEffects).toBe(true);
      expect(eff.largeLettersEnabled).toBe(true);
    });

    it('forces reduced motion regardless of system preference', () => {
      const eff = resolveCosyPreferences({ ...cosy, reduceMotion: false, systemPrefersReducedMotion: false });
      expect(eff.shouldReduceMotion).toBe(true);
    });

    it('switches to gentle celebrations and suppresses timer urgency', () => {
      const eff = resolveCosyPreferences(cosy);
      expect(eff.celebrationIntensity).toBe('gentle');
      expect(eff.suppressTimerUrgency).toBe(true);
    });
  });

  it('toggling cosy off restores the underlying flags (no sticky state)', () => {
    // A user enables cosy, then disables it — the resolver is pure, so the
    // effective values fall straight back to the underlying stored flags.
    const withCosy = resolveCosyPreferences({ ...baseline, cosyMode: true });
    const withoutCosy = resolveCosyPreferences({ ...baseline, cosyMode: false });
    expect(withCosy.disableFireRoundLights).toBe(true);
    expect(withoutCosy.disableFireRoundLights).toBe(false);
  });
});
