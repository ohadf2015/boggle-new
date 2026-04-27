import { describe, it, expect } from 'vitest';
import { buildLocaleLlms } from '../content';

describe('buildLocaleLlms', () => {
    const locales = ['en', 'he', 'sv', 'ja', 'es'] as const;

    it('returns a non-empty string for every supported locale', () => {
        for (const locale of locales) {
            const out = buildLocaleLlms(locale);
            expect(typeof out).toBe('string');
            expect(out.length).toBeGreaterThan(500);
        }
    });

    it('falls back to English content for unknown locale', () => {
        const fallback = buildLocaleLlms('xx');
        expect(fallback).toBe(buildLocaleLlms('en'));
    });

    it('starts each locale output with an h1 heading', () => {
        for (const locale of locales) {
            expect(buildLocaleLlms(locale)).toMatch(/^# /);
        }
    });

    it('embeds the locale-prefixed URL paths', () => {
        for (const locale of locales) {
            const out = buildLocaleLlms(locale);
            expect(out).toContain(`https://www.lexiclash.live/${locale}/multiplayer`);
            expect(out).toContain(`https://www.lexiclash.live/${locale}/daily`);
        }
    });

    it('Swedish output references Wordfeud (competitor positioning)', () => {
        expect(buildLocaleLlms('sv')).toMatch(/Wordfeud/);
    });

    it('Spanish output references Apalabrados (competitor positioning)', () => {
        expect(buildLocaleLlms('es')).toMatch(/Apalabrados/);
    });

    it('Japanese output uses katakana/hiragana (not pure English)', () => {
        const ja = buildLocaleLlms('ja');
        expect(ja).toMatch(/[぀-ヿ]/);
    });

    it('Hebrew output references Hebrew brand keywords', () => {
        expect(buildLocaleLlms('he')).toMatch(/משחק מילים/);
    });
});
