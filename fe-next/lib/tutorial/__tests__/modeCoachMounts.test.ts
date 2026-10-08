import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

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
});
