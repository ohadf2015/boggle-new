import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS_PER_ROOM, ROOM_CODE_LENGTH } from '@/shared/constants/gameConstants';
import { AD_CLAIM, ANDROID_ADS_FAQ, faqs, compareRows, PAIN_POINTS } from '../content';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'page.tsx'), 'utf8');
const CONTENT = fs.readFileSync(path.join(__dirname, '..', 'content.ts'), 'utf8');

/**
 * The page sells LexiClash against an ad-heavy competitor, so its ad claim is
 * the one sentence a future copy edit could make false. Web ads ship dormant
 * (`useInterstitialAd` routes production web to H5 Games Ads behind
 * `NEXT_PUBLIC_H5_ADS_ENABLED`), and the Android app declares "contains ads" —
 * so the claim stays scoped to the browser and never becomes an absolute.
 */
describe('boggle-with-friends-alternative ad claim stays true', () => {
  it('scopes the ad claim to the browser', () => {
    expect(AD_CLAIM).toMatch(/browser/i);
    expect(SRC).toContain('{AD_CLAIM}');
  });

  it('never claims a permanent absence of ads', () => {
    const absolutes = /\bad[- ]free\b|\bnever any ads\b|\bno ads,? ever\b|\bzero ads\b|\bads? free forever\b/i;
    expect(AD_CLAIM).not.toMatch(absolutes);
    expect(CONTENT).not.toMatch(absolutes);
  });

  it('discloses that the Android app carries ads', () => {
    expect(ANDROID_ADS_FAQ.a).toMatch(/android/i);
    expect(ANDROID_ADS_FAQ.a).toMatch(/\bads?\b/i);
    expect(faqs).toContain(ANDROID_ADS_FAQ);
  });

  it('leads on pay-to-win, the claim no env flag can falsify', () => {
    expect(PAIN_POINTS[0].title).toMatch(/pay-to-win|power-up/i);
  });

  /**
   * Solo modes DO spend earned coins (`lib/blast/blastUpgradeCatalog.ts`,
   * `components/daily/survival/useSurvivalHints.ts`), so the no-boosts claim is
   * only true of a multiplayer room and has to say so.
   */
  it('scopes the no-power-ups claim to multiplayer', () => {
    expect(PAIN_POINTS[0].title + PAIN_POINTS[0].desc).toMatch(/multiplayer/i);
    const powerUpRow = compareRows.find((r) => /power-up/i.test(r[0]));
    expect(powerUpRow?.[1]).toMatch(/multiplayer/i);
  });
});

describe('boggle-with-friends-alternative numbers match the server', () => {
  it('states the room cap and room-code length the server enforces', () => {
    const copy = [...faqs.map((f) => f.a), ...compareRows.map((r) => r[1])].join(' ');
    expect(copy).toContain(`${MAX_PLAYERS_PER_ROOM} players`);
    expect(copy).toContain(`${ROOM_CODE_LENGTH}-character`);
  });

  it('never retypes the cap or code length as a literal', () => {
    expect(CONTENT).toContain('MAX_PLAYERS_PER_ROOM');
    expect(CONTENT).toContain('ROOM_CODE_LENGTH');
  });
});

describe('boggle-with-friends-alternative answers the target queries', () => {
  it('names Boggle With Friends in a visible heading and in the FAQ', () => {
    expect(SRC).toMatch(/Boggle With Friends/);
    expect(faqs.some((f) => /boggle with friends/i.test(f.q))).toBe(true);
  });

  it('keeps a play CTA in the hero', () => {
    const hero = SRC.slice(0, SRC.indexOf('STATS STRIP'));
    expect(hero).toContain('/multiplayer');
  });
});
