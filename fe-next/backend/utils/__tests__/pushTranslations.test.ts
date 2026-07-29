import { describe, it, expect } from 'vitest';
import { translatePush, isPushLocale, SUPPORTED_PUSH_LOCALES, countryToLocale } from '../pushTranslations';

describe('pushTranslations', () => {
  describe('isPushLocale', () => {
    it('accepts supported locales', () => {
      for (const loc of SUPPORTED_PUSH_LOCALES) {
        expect(isPushLocale(loc)).toBe(true);
      }
    });

    it('rejects unsupported locales', () => {
      expect(isPushLocale('fr')).toBe(false);
      expect(isPushLocale('')).toBe(false);
      expect(isPushLocale(null)).toBe(false);
      expect(isPushLocale(undefined)).toBe(false);
      expect(isPushLocale(42)).toBe(false);
    });
  });

  describe('translatePush', () => {
    it('renders English by default', () => {
      const out = translatePush('en', 'friendRequest.title');
      expect(out).toBe('Friend Request');
    });

    it('renders Hebrew', () => {
      const out = translatePush('he', 'friendRequest.title');
      expect(out).toMatch(/[֐-׿]/);
    });

    it('renders Japanese', () => {
      const out = translatePush('ja', 'friendRequest.title');
      expect(out).toMatch(/[぀-ヿ一-鿿]/);
    });

    it('interpolates {var} tokens', () => {
      const out = translatePush('en', 'friendRequest.body', { sender: 'Alice' });
      expect(out).toBe('Alice sent you a friend request!');
    });

    it('interpolates numbers as strings', () => {
      const out = translatePush('en', 'levelUp.title', { level: 7 });
      expect(out).toBe('Level 7!');
    });

    it('leaves missing params as placeholder', () => {
      const out = translatePush('en', 'friendRequest.body');
      expect(out).toContain('{sender}');
    });

    it('falls back to English when locale missing', () => {
      const he = translatePush('he', 'friendRequest.title');
      const en = translatePush('en', 'friendRequest.title');
      // @ts-expect-error intentionally invalid
      const fallback = translatePush('zz', 'friendRequest.title');
      expect(fallback).toBe(en);
      expect(he).not.toBe(en);
    });

    it('returns raw key when missing everywhere', () => {
      const out = translatePush('en', 'nonexistent.key.xyz');
      expect(out).toBe('nonexistent.key.xyz');
    });

    it('handles null/undefined locale by using English', () => {
      const en = translatePush('en', 'friendRequest.title');
      expect(translatePush(null, 'friendRequest.title')).toBe(en);
      expect(translatePush(undefined, 'friendRequest.title')).toBe(en);
    });

    it('all locales have all keys', () => {
      const keys = [
        'friendRequest.title', 'friendRequest.body',
        'friendAccepted.title', 'friendAccepted.body',
        'gameInvite.title', 'gameInvite.body',
        'turnReminder.title', 'turnReminder.body',
        'achievement.title', 'achievement.body',
        'directMessage.title', 'directMessage.body',
        'challengeAccepted.title', 'challengeAccepted.body',
        'challengeDeclined.title', 'challengeDeclined.body',
        'giftReceived.title', 'giftReceived.body',
        'giftLabel.hints', 'giftLabel.streak_freeze', 'giftLabel.coins',
        'dailyChallenge.title', 'dailyChallenge.body',
        'levelUp.title', 'levelUp.body',
      ];
      for (const loc of SUPPORTED_PUSH_LOCALES) {
        for (const key of keys) {
          const out = translatePush(loc, key);
          expect(out, `${loc}:${key}`).not.toBe(key);
        }
      }
    });
  });

  describe('countryToLocale', () => {
    it('maps IL → he', () => {
      expect(countryToLocale('IL')).toBe('he');
    });

    it('maps JP → ja', () => {
      expect(countryToLocale('JP')).toBe('ja');
    });

    it('maps SE → sv', () => {
      expect(countryToLocale('SE')).toBe('sv');
    });

    it('maps Spanish-speaking countries → es', () => {
      for (const cc of ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'BO', 'CR', 'GT', 'HN', 'NI', 'PA', 'PY', 'SV', 'UY', 'DO', 'PR']) {
        expect(countryToLocale(cc), cc).toBe('es');
      }
    });

    it('is case-insensitive', () => {
      expect(countryToLocale('il')).toBe('he');
      expect(countryToLocale('jp')).toBe('ja');
    });

    it('returns null for unmapped or invalid input', () => {
      expect(countryToLocale('US')).toBeNull();
      expect(countryToLocale('GB')).toBeNull();
      expect(countryToLocale(null)).toBeNull();
      expect(countryToLocale(undefined)).toBeNull();
      expect(countryToLocale('')).toBeNull();
    });
  });
});
