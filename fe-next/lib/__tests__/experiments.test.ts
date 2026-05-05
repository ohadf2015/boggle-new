/**
 * Experiment registry — invariants only.
 *
 * Why a registry: PostHog's UI lists flags but doesn't enforce variant
 * shape, default fallbacks, or one-source-of-truth typing. Drift causes
 * silent bugs (flag returns "v2" but call site only handles "control" |
 * "v1"). Registry surfaces that at compile + test time.
 */

import { describe, it, expect } from 'vitest';
import {
  EXPERIMENTS,
  experimentDefault,
  experimentEmailOverride,
  isValidVariant,
  type ExperimentKey,
} from '../experiments';

describe('experiments registry', () => {
  it('exposes at least one experiment', () => {
    expect(Object.keys(EXPERIMENTS).length).toBeGreaterThan(0);
  });

  it('every experiment has a non-empty variants array', () => {
    for (const [key, cfg] of Object.entries(EXPERIMENTS)) {
      expect(cfg.variants.length, `${key} variants`).toBeGreaterThan(0);
    }
  });

  it('every experiment default is in its variants list', () => {
    for (const [key, cfg] of Object.entries(EXPERIMENTS)) {
      expect(cfg.variants, `${key} default`).toContain(cfg.default);
    }
  });

  it('every experiment has a description (audit trail)', () => {
    for (const [key, cfg] of Object.entries(EXPERIMENTS)) {
      expect(cfg.description, `${key} description`).toBeTruthy();
      expect(cfg.description.length, `${key} description length`).toBeGreaterThan(10);
    }
  });

  it('flag keys are kebab-case (PostHog convention)', () => {
    for (const key of Object.keys(EXPERIMENTS)) {
      expect(key, `${key} casing`).toMatch(/^[a-z][a-z0-9.-]*$/);
    }
  });

  describe('experimentDefault', () => {
    it('returns the default variant for a known key', () => {
      const key = Object.keys(EXPERIMENTS)[0] as ExperimentKey;
      expect(experimentDefault(key)).toBe(EXPERIMENTS[key].default);
    });
  });

  describe('isValidVariant', () => {
    it('returns true for a known variant', () => {
      const key = Object.keys(EXPERIMENTS)[0] as ExperimentKey;
      const variant = EXPERIMENTS[key].variants[0];
      expect(isValidVariant(key, variant)).toBe(true);
    });

    it('returns false for an unknown variant', () => {
      const key = Object.keys(EXPERIMENTS)[0] as ExperimentKey;
      expect(isValidVariant(key, '__nope__')).toBe(false);
    });

    it('returns false for null / undefined', () => {
      const key = Object.keys(EXPERIMENTS)[0] as ExperimentKey;
      expect(isValidVariant(key, null)).toBe(false);
      expect(isValidVariant(key, undefined)).toBe(false);
    });
  });

  describe('experimentEmailOverride', () => {
    it('returns null when no override map is configured', () => {
      // signup-prompt-cta-copy has no forceVariantByEmail
      expect(experimentEmailOverride('signup-prompt-cta-copy', 'someone@x.com')).toBeNull();
    });

    it('returns null for an email not present in the override map', () => {
      expect(experimentEmailOverride('blast.candy-shell.enabled', 'random@x.com')).toBeNull();
    });

    it('returns null when the email is null/undefined', () => {
      expect(experimentEmailOverride('blast.candy-shell.enabled', null)).toBeNull();
      expect(experimentEmailOverride('blast.candy-shell.enabled', undefined)).toBeNull();
    });

    it('matches email case-insensitively', () => {
      expect(experimentEmailOverride('blast.candy-shell.enabled', 'OHADF2015@GMAIL.COM')).toBe('candy');
    });

    it('forces blast.candy-shell.enabled = candy for ohadf2015@gmail.com', () => {
      expect(experimentEmailOverride('blast.candy-shell.enabled', 'ohadf2015@gmail.com')).toBe('candy');
    });
  });

  describe('blast.candy-shell.enabled flag', () => {
    it('is registered with control + candy variants', () => {
      expect(EXPERIMENTS['blast.candy-shell.enabled'].variants).toEqual(['control', 'candy']);
    });

    it('defaults to control (gated rollout)', () => {
      expect(EXPERIMENTS['blast.candy-shell.enabled'].default).toBe('control');
    });

    it('lists ohadf2015@gmail.com on the email override allowlist', () => {
      const cfg = EXPERIMENTS['blast.candy-shell.enabled'];
      expect(cfg.forceVariantByEmail?.['ohadf2015@gmail.com']).toBe('candy');
    });
  });

  describe('mp.desktop-shell.v1 flag', () => {
    it('exists in registry', () => {
      expect(EXPERIMENTS['mp.desktop-shell.v1']).toBeDefined();
    });

    it('defaults to "on" so all desktop users see shell', () => {
      expect(EXPERIMENTS['mp.desktop-shell.v1'].default).toBe('on');
    });

    it('has on/off variants for kill-switch', () => {
      expect(EXPERIMENTS['mp.desktop-shell.v1'].variants).toEqual(['on', 'off']);
    });
  });
});
