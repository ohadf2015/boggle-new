import { describe, it, expect } from 'vitest';
import { pickLandingMessages } from '../pickLandingMessages';
import { LANDING_NAMESPACES, LANDING_EXTRA_KEYS } from '../landingNamespaces';

describe('pickLandingMessages', () => {
  const catalogue = {
    landing: { welcomeTitle: 'Play' },
    nav: { home: 'Home' },
    education: { home: { promo_title: 'Class', buried: 'nope' }, other: 'skip' },
    legal: { privacyPolicy: 'Privacy', giant: 'x'.repeat(1000) },
    adventure: { huge: 'leave me out' },
    direction: 'ltr',
    flag: '🇺🇸',
  };

  it('copies allowlisted namespaces and marks the result partial', () => {
    const picked = pickLandingMessages(catalogue, ['landing', 'nav', 'direction', 'flag'], []);
    expect(picked.__partial).toBe(true);
    expect(picked.landing).toEqual({ welcomeTitle: 'Play' });
    expect(picked.nav).toEqual({ home: 'Home' });
    expect(picked.adventure).toBeUndefined();
    expect(picked.direction).toBe('ltr');
  });

  it('grafts extra dotted keys without taking the rest of that namespace', () => {
    const picked = pickLandingMessages(catalogue, ['landing'], ['education.home.promo_title', 'legal.privacyPolicy']);
    expect((picked.education as { home: { promo_title: string } }).home.promo_title).toBe('Class');
    expect((picked.education as { home: { buried?: string } }).home.buried).toBeUndefined();
    expect((picked.education as { other?: string }).other).toBeUndefined();
    expect((picked.legal as { privacyPolicy: string }).privacyPolicy).toBe('Privacy');
    expect((picked.legal as { giant?: string }).giant).toBeUndefined();
  });

  it('ships a catalogue far smaller than the full English file', () => {
    const en = require('../../../translations/en.js').en as Record<string, unknown>;
    const picked = pickLandingMessages(en, LANDING_NAMESPACES, LANDING_EXTRA_KEYS);
    const full = JSON.stringify(en).length;
    const small = JSON.stringify(picked).length;
    expect(small).toBeLessThan(full * 0.25);
    expect(small).toBeGreaterThan(8_000);
    expect(picked.landing).toBeDefined();
    expect(picked.nav).toBeDefined();
    expect(picked.education).toBeDefined();
    expect((picked as { adventure?: unknown }).adventure).toBeUndefined();
  });
});
