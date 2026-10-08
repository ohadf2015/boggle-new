import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';
import { MODE_COACH } from '@/lib/tutorial/modeCoachContent';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('mode coach mounts', () => {
  it('Word Tower v2 shows the wordTower coach', () => {
    expect(src('components/wordTowerV2/WordTowerV2.tsx')).toMatch(/<ModeCoach mode="wordTower"/);
  });

  it('the adventure play screen shows the adventure coach', () => {
    expect(src('components/adventure/play/AdventureLevel.tsx')).toMatch(/<ModeCoach mode="adventure"/);
  });

  it('wordTower coach teaches the v2 loop (spell, then drop) in every locale', () => {
    const old: Record<string, string> = {
      en: 'Tap to drop each block',
      he: 'הקישו כדי להפיל בלוק',
      sv: 'Tryck för att släppa blocket',
      ja: 'タップでブロックを落とす',
      es: 'Toca, suelta el bloque',
      ru: 'Нажимай, чтобы сбросить блок',
    };
    for (const [lang, bundle] of Object.entries({ en, he, sv, ja, es, ru })) {
      const coach = (bundle as { modeCoach: { wordTower: { step1: string; step2: string } } }).modeCoach.wordTower;
      expect(coach.step1, lang).not.toBe(old[lang]);
      expect(coach.step1, lang).not.toBe(coach.step2);
    }
  });

  it('pass-and-play party shows the party coach', () => {
    expect(src('components/party/PartyPlay.tsx')).toMatch(/<ModeCoach mode="party"/);
  });

  it('every party coach key is translated in all 6 locales', () => {
    const c = MODE_COACH.party;
    const keys = [c.titleKey, ...c.steps.map((s) => s.captionKey), c.scoreTipKey].filter(Boolean) as string[];
    for (const [lang, bundle] of Object.entries({ en, he, sv, ja, es, ru })) {
      for (const key of keys) {
        const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], bundle);
        expect(typeof v, `${lang}:${key}`).toBe('string');
      }
    }
  });
});
